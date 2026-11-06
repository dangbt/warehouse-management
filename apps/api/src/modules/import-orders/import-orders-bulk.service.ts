import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { VoucherService, parseVoucherDate } from '../common/voucher.service';
import { assertValidItems, buildOrderLines, sumLines } from './import-order-lines';
import type { CreateImportOrderInput } from './import-orders.service';

/** Giới hạn dòng hàng mỗi lần nhập hàng loạt (khớp giới hạn file Excel phía client). */
export const BULK_MAX_ITEMS = 2000;

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

    try {
      return await this.prisma.$transaction(async (tx) => {
        const orders: BulkImportReport['orders'] = [];
        for (const [idx, o] of body.orders.entries()) {
          const hasInvoice = o.has_invoice ?? false;
          const invoiceNo = hasInvoice ? o.invoice_no!.trim() : null;
          const invoiceSymbol = hasInvoice ? o.invoice_symbol?.trim() || null : null;
          if (hasInvoice) {
            const dup = await tx.importOrder.findFirst({
              where: { supplierId: o.supplier_id, invoiceSymbol, invoiceNo, status: { not: 'REJECTED' } },
              select: { code: true },
            });
            if (dup) throw new BadRequestException(`Phiếu #${idx + 1}: hoá đơn đã được nhập ở phiếu ${dup.code}`);
          }
          const lines = buildOrderLines(o.items, hasInvoice);
          const sums = sumLines(lines);
          const voucherNo = voucherNos[idx];
          const created = await tx.importOrder.create({
            data: {
              code: voucherNo,
              voucherNo,
              voucherDate: parseVoucherDate(o.voucher_date),
              supplierId: o.supplier_id,
              hasInvoice,
              invoiceNo,
              invoiceSymbol,
              invoiceDate: hasInvoice ? new Date(o.invoice_date!) : null,
              purchaseAddress: hasInvoice ? null : o.purchase_address?.trim() || null,
              ...sums,
              paid: o.paid ?? false,
              note: o.note,
              createdById: userId,
              items: { create: lines },
            },
            select: { id: true },
          });
          orders.push({
            id: created.id,
            code: voucherNo,
            voucherNo,
            supplierId: o.supplier_id,
            itemCount: lines.length,
            totalAmount: sums.totalAmount,
          });
        }
        return {
          created: orders.length,
          itemCount: orders.reduce((s, x) => s + x.itemCount, 0),
          totalAmount: orders.reduce((s, x) => s + x.totalAmount, 0),
          orders,
        };
      });
    } catch (e) {
      // Race số chứng từ (unique) → 409 có code chuẩn.
      this.vouchers.rethrowUnique(e, '(tạo hàng loạt)');
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
    const auto = autoCount ? await this.vouchers.nextNos('IMPORT', autoCount) : [];
    let k = 0;
    return manual.map((n) => n || auto[k++]);
  }
}
