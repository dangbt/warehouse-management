import { randomUUID } from 'crypto';
import { Injectable, BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { VoucherService, parseVoucherDate } from '../common/voucher.service';
import { assertValidItems, buildOrderLines, sumLines } from './import-order-lines';
import type { CreateImportOrderInput } from './import-orders.service';

/** Giới hạn dòng hàng mỗi lần nhập hàng loạt (khớp giới hạn file Excel phía client). */
export const BULK_MAX_ITEMS = 2000;

/** Timeout transaction cho lô lớn (mặc định Prisma chỉ 5s). */
export const BULK_TX_TIMEOUT_MS = 60_000;

/** Chặn giá trị vượt cột Decimal bằng lỗi rõ ràng thay vì lỗi DB thô. */
export function assertDecimalRange(
  lines: { quantity: number; unitPrice: number; totalPrice: number; vatAmount: number }[],
  idx: number,
): void {
  for (const l of lines) {
    if (l.quantity >= 1e7 || l.unitPrice >= 1e10 || l.totalPrice >= 1e12 || l.vatAmount >= 1e12) {
      throw new BadRequestException(`Phiếu #${idx + 1}: số lượng hoặc đơn giá vượt giới hạn cho phép`);
    }
  }
}

export interface BulkImportInput {
  orders: CreateImportOrderInput[];
}

export interface BulkImportReport {
  created: number;
  itemCount: number;
  totalAmount: number;
  orders: { id: string; code: string; voucherNo: string; supplierId: string; itemCount: number; totalAmount: number }[];
}

/** Kiểm tra cấu trúc + dữ liệu từng phiếu (thuần, không đụng DB). Lỗi gắn số thứ tự phiếu. */
export function validateBulkInput(body: BulkImportInput): void {
  if (!Array.isArray(body?.orders) || body.orders.length === 0) throw new BadRequestException('Không có phiếu nào để tạo');
  const total = body.orders.reduce((s, o) => s + (o.items?.length ?? 0), 0);
  if (total > BULK_MAX_ITEMS) throw new BadRequestException(`Tối đa ${BULK_MAX_ITEMS} dòng mỗi lần nhập`);

  const seenNos = new Set<string>();
  const seenInvoices = new Set<string>();
  body.orders.forEach((o, idx) => {
    const tag = `Phiếu #${idx + 1}`;
    try {
      if (!o.supplier_id || !o.items?.length) throw new BadRequestException('Thiếu nhà cung cấp hoặc danh sách hàng');
      const hasInvoice = o.has_invoice ?? false;
      if (hasInvoice) {
        if (!o.invoice_no?.trim()) throw new BadRequestException('Thiếu số hoá đơn');
        if (!o.invoice_date || isNaN(new Date(o.invoice_date).getTime())) throw new BadRequestException('Ngày hoá đơn không hợp lệ');
        const key = `${o.supplier_id}|${o.invoice_symbol?.trim() ?? ''}|${o.invoice_no.trim()}`;
        if (seenInvoices.has(key)) throw new BadRequestException('Hoá đơn trùng với phiếu khác trong file');
        seenInvoices.add(key);
      }
      parseVoucherDate(o.voucher_date);
      const no = o.voucher_no?.trim();
      if (no) {
        if (seenNos.has(no)) throw new BadRequestException(`Số chứng từ ${no} bị trùng trong file`);
        seenNos.add(no);
      }
      assertValidItems(o.items, hasInvoice);
    } catch (e) {
      if (e instanceof BadRequestException) throw new BadRequestException(`${tag}: ${e.message}`);
      throw e;
    }
  });
}

@Injectable()
export class ImportOrdersBulkService {
  constructor(
    private prisma: PrismaService,
    private vouchers: VoucherService,
  ) {}

  /** Tạo nhiều phiếu PENDING trong 1 transaction: một phiếu lỗi ⇒ không phiếu nào được tạo. */
  async bulkCreate(userId: string, body: BulkImportInput): Promise<BulkImportReport> {
    validateBulkInput(body);
    await this.assertReferences(body);
    const voucherNos = await this.resolveVoucherNos(body);

    const prepared = body.orders.map((o, idx) => {
      const hasInvoice = o.has_invoice ?? false;
      const lines = buildOrderLines(o.items, hasInvoice);
      assertDecimalRange(lines, idx);
      return { o, idx, hasInvoice, lines, sums: sumLines(lines), id: randomUUID(), voucherNo: voucherNos[idx] };
    });
    const supplierAddress = await this.supplierAddresses(
      prepared.filter((p) => !p.hasInvoice && !p.o.purchase_address?.trim()).map((p) => p.o.supplier_id),
    );

    try {
      // Không còn round trip riêng từng phiếu: 1 query kiểm hoá đơn + 2 createMany (phiếu, dòng hàng).
      return await this.prisma.$transaction(
        async (tx) => {
          await this.assertInvoicesNew(tx, prepared);
          await tx.importOrder.createMany({
            data: prepared.map((p) => ({
              id: p.id,
              code: p.voucherNo,
              voucherNo: p.voucherNo,
              voucherDate: parseVoucherDate(p.o.voucher_date),
              supplierId: p.o.supplier_id,
              hasInvoice: p.hasInvoice,
              invoiceNo: p.hasInvoice ? p.o.invoice_no!.trim() : null,
              invoiceSymbol: p.hasInvoice ? p.o.invoice_symbol?.trim() || null : null,
              invoiceDate: p.hasInvoice ? new Date(p.o.invoice_date!) : null,
              purchaseAddress: p.hasInvoice ? null : p.o.purchase_address?.trim() || supplierAddress.get(p.o.supplier_id)?.trim() || null,
              ...p.sums,
              paid: p.o.paid ?? false,
              note: p.o.note,
              createdById: userId,
            })),
          });
          await tx.importOrderItem.createMany({
            data: prepared.flatMap((p) => p.lines.map((l) => ({ ...l, importOrderId: p.id }))),
          });
          const orders = prepared.map((p) => ({
            id: p.id,
            code: p.voucherNo,
            voucherNo: p.voucherNo,
            supplierId: p.o.supplier_id,
            itemCount: p.lines.length,
            totalAmount: p.sums.totalAmount,
          }));
          return {
            created: orders.length,
            itemCount: orders.reduce((s, x) => s + x.itemCount, 0),
            totalAmount: orders.reduce((s, x) => s + x.totalAmount, 0),
            orders,
          };
        },
        { maxWait: 10_000, timeout: BULK_TX_TIMEOUT_MS },
      );
    } catch (e) {
      if ((e as { code?: string })?.code === 'P2028') {
        throw new ServiceUnavailableException(
          'Nhập hàng loạt quá thời gian xử lý, chưa có phiếu nào được tạo. Hãy chia nhỏ file rồi thử lại.',
        );
      }
      // Race số chứng từ (unique) → 409 có code chuẩn.
      this.vouchers.rethrowUnique(e, '(tạo hàng loạt)');
    }
  }

  private async supplierAddresses(ids: string[]): Promise<Map<string, string | null>> {
    const uniq = [...new Set(ids)];
    if (!uniq.length) return new Map();
    const rows = await this.prisma.supplier.findMany({ where: { id: { in: uniq } }, select: { id: true, address: true } });
    return new Map(rows.map((r) => [r.id, r.address]));
  }

  /** Kiểm tra trùng hoá đơn với DB bằng 1 query cho cả lô. */
  private async assertInvoicesNew(
    tx: Prisma.TransactionClient,
    prepared: { o: CreateImportOrderInput; idx: number; hasInvoice: boolean }[],
  ) {
    const inv = prepared.filter((p) => p.hasInvoice);
    if (!inv.length) return;
    const norm = (p: (typeof inv)[number]) => ({
      supplierId: p.o.supplier_id,
      invoiceSymbol: p.o.invoice_symbol?.trim() || null,
      invoiceNo: p.o.invoice_no!.trim(),
    });
    const found = await tx.importOrder.findMany({
      where: { status: { not: 'REJECTED' }, OR: inv.map(norm) },
      select: { code: true, supplierId: true, invoiceSymbol: true, invoiceNo: true },
    });
    for (const p of inv) {
      const k = norm(p);
      const dup = found.find((f) => f.supplierId === k.supplierId && f.invoiceSymbol === k.invoiceSymbol && f.invoiceNo === k.invoiceNo);
      if (dup) throw new BadRequestException(`Phiếu #${p.idx + 1}: hoá đơn đã được nhập ở phiếu ${dup.code}`);
    }
  }

  private async assertReferences(body: BulkImportInput) {
    const supplierIds = [...new Set(body.orders.map((o) => o.supplier_id))];
    const ingredientIds = [...new Set(body.orders.flatMap((o) => o.items.map((i) => i.ingredient_id)))];
    const [suppliers, ingredients] = await Promise.all([
      this.prisma.supplier.findMany({ where: { id: { in: supplierIds } }, select: { id: true } }),
      this.prisma.ingredient.findMany({ where: { id: { in: ingredientIds } }, select: { id: true } }),
    ]);
    if (suppliers.length !== supplierIds.length) throw new BadRequestException('Có nhà cung cấp không tồn tại');
    if (ingredients.length !== ingredientIds.length) throw new BadRequestException('Có nguyên liệu không tồn tại');
  }

  /** Số nhập tay: kiểm tra trùng DB; bỏ trống: cấp số liên tiếp theo cấu hình. */
  private async resolveVoucherNos(body: BulkImportInput): Promise<string[]> {
    const manual = body.orders.map((o) => o.voucher_no?.trim() || '');
    for (const no of manual) {
      if (no) {
        if (no.length > 50) throw new BadRequestException('Số chứng từ quá dài');
        if (await this.vouchers.hasNo('IMPORT', no)) throw this.vouchers.duplicate(no);
      }
    }
    const autoCount = manual.filter((n) => !n).length;
    // Lấy dư số để tránh trùng với số nhập tay trong cùng file.
    const taken = new Set(manual.filter(Boolean));
    const auto = autoCount
      ? (await this.vouchers.nextNos('IMPORT', autoCount + taken.size)).filter((n) => !taken.has(n)).slice(0, autoCount)
      : [];
    let k = 0;
    return manual.map((n) => n || auto[k++]);
  }
}
