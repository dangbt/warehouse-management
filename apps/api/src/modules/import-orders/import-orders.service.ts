import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TaxService } from '../tax/tax.service';
import { voucherDateFilter, toNum } from '../common/voucher-date-filter';
import { VoucherService, parseVoucherDate } from '../common/voucher.service';
import { assertPoReceivable, applyReceiptToPo } from '../purchasing/purchase-receipt';
import { PeriodLockService } from '../common/period-lock.service';
import { buildLines, parseInvoice } from './import-order-builder';
import { VatRate, computeUnitCost, TaxRegime, roundVnd, computeLineVat } from '../tax/vat';

// Re-export để giữ tương thích với các import cũ từ module này (vd spec).
export { roundVnd, computeLineVat };

export interface ImportOrderItemInput {
  ingredient_id: string;
  quantity: number;
  unit_price: number;
  expiry_date?: string;
  // Quy đổi ĐVT đóng gói → đơn vị tồn. VD nhập 5 thùng, mỗi thùng 24 chai ⇒ factor = 24.
  // Bỏ trống ⇒ factor = 1 (nhập theo đúng đơn vị tồn). unit_price tính theo đơn vị tồn.
  unit?: string;
  factor?: number;
  // Thuế suất VAT của dòng (bắt buộc khi has_invoice). null/bỏ trống = không thuế.
  vat_rate?: string;
}

export interface CreateImportOrderInput {
  supplier_id: string;
  note?: string;
  // Ngày chứng từ (ISO, mặc định hôm nay) + số chứng từ (bỏ trống ⇒ tự sinh theo tiền tố).
  voucher_date?: string;
  voucher_no?: string;
  paid?: boolean;
  has_invoice?: boolean;
  invoice_no?: string;
  invoice_symbol?: string;
  invoice_date?: string;
  // Địa chỉ nơi mua (áp dụng khi không có hoá đơn). Bỏ trống ⇒ mặc định lấy từ địa chỉ NCC.
  purchase_address?: string;
  // Liên kết đơn mua hàng (PO) — duyệt phiếu sẽ cập nhật SL đã nhận của PO.
  purchase_order_id?: string;
  items: ImportOrderItemInput[];
}

@Injectable()
export class ImportOrdersService {
  constructor(
    private prisma: PrismaService,
    private tax: TaxService,
    private vouchers: VoucherService,
    private periodLock: PeriodLockService,
  ) {}

  async findAll(q: {
    page?: string;
    limit?: string;
    status?: string;
    supplier_id?: string;
    has_invoice?: string;
    id?: string;
    from?: string;
    to?: string;
  }) {
    const page = +(q.page || 1),
      limit = +(q.limit || 20);
    const where: { id?: string; status?: string; supplierId?: string; hasInvoice?: boolean; voucherDate?: { gte?: Date; lte?: Date } } = {};
    if (q.id) where.id = q.id;
    const dateRange = voucherDateFilter(q);
    if (dateRange) where.voucherDate = dateRange;
    if (q.status) where.status = q.status;
    if (q.supplier_id) where.supplierId = q.supplier_id;
    if (q.has_invoice === 'true') where.hasInvoice = true;
    else if (q.has_invoice === 'false') where.hasInvoice = false;
    const [data, total, agg] = await Promise.all([
      this.prisma.importOrder.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [{ voucherDate: 'desc' }, { createdAt: 'desc' }],
        include: { supplier: true, items: { include: { ingredient: true } } },
      }),
      this.prisma.importOrder.count({ where }),
      this.prisma.importOrder.aggregate({ where, _sum: { subtotal: true, vatAmount: true, totalAmount: true } }),
    ]);
    const totals = { subtotal: toNum(agg._sum.subtotal), vatAmount: toNum(agg._sum.vatAmount), totalAmount: toNum(agg._sum.totalAmount) };
    return { data, meta: { page, limit, total, totals } };
  }

  /** Chỉ tên/địa chỉ/MST đơn vị để in chứng từ — không lộ cấu hình thuế khác. */
  async getPrintHeader() {
    const s = await this.tax.getSettings();
    return { companyName: s.companyName, address: s.address, taxCode: s.taxCode };
  }

  async findOne(id: string) {
    const order = await this.prisma.importOrder.findUnique({
      where: { id },
      include: { supplier: true, items: { include: { ingredient: true } } },
    });
    if (!order) throw new NotFoundException('Không tìm thấy phiếu nhập');
    return order;
  }

  async create(userId: string, body: CreateImportOrderInput) {
    if (!body.supplier_id || !body.items?.length) throw new BadRequestException('Thiếu nhà cung cấp hoặc danh sách hàng');

    const { hasInvoice, invoiceNo, invoiceSymbol, invoiceDate } = parseInvoice(body);
    if (hasInvoice) await this.assertInvoiceUnique(body.supplier_id, invoiceSymbol, invoiceNo!);
    const { lines, subtotal, vatAmount, totalAmount } = buildLines(body, hasInvoice);

    if (body.purchase_order_id) await assertPoReceivable(this.prisma, body.purchase_order_id, body.supplier_id);

    const voucherDate = parseVoucherDate(body.voucher_date);
    await this.periodLock.assertOpen(voucherDate);
    const voucherNo = await this.vouchers.resolveNo('IMPORT', body.voucher_no);
    const code = voucherNo;

    const purchaseAddress = await this.resolvePurchaseAddress(body, hasInvoice);

    try {
      return await this.prisma.importOrder.create({
        data: {
          code,
          voucherNo,
          voucherDate,
          supplierId: body.supplier_id,
          hasInvoice,
          invoiceNo,
          invoiceSymbol,
          invoiceDate,
          purchaseAddress,
          purchaseOrderId: body.purchase_order_id || null,
          subtotal,
          vatAmount,
          totalAmount,
          paid: body.paid ?? false,
          note: body.note,
          createdById: userId,
          items: { create: lines },
        },
        include: { items: true },
      });
    } catch (e) {
      this.vouchers.rethrowUnique(e, voucherNo);
    }
  }

  /** Chống trùng hoá đơn: cùng NCC + ký hiệu + số HĐ, bỏ qua phiếu đã từ chối/huỷ (và phiếu đang sửa). */
  private async assertInvoiceUnique(supplierId: string, invoiceSymbol: string | null, invoiceNo: string, excludeId?: string) {
    const dup = await this.prisma.importOrder.findFirst({
      where: {
        supplierId,
        invoiceSymbol,
        invoiceNo,
        status: { notIn: ['REJECTED', 'CANCELLED'] },
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: { code: true },
    });
    if (dup) throw new BadRequestException(`Hoá đơn đã được nhập ở phiếu ${dup.code}`);
  }

  /** Địa chỉ nơi mua (chỉ hàng không hoá đơn): ưu tiên nhập tay, bỏ trống thì lấy địa chỉ NCC. */
  private async resolvePurchaseAddress(body: CreateImportOrderInput, hasInvoice: boolean): Promise<string | null> {
    if (hasInvoice) return null;
    const explicit = body.purchase_address?.trim();
    if (explicit) return explicit;
    const supplier = await this.prisma.supplier.findUnique({ where: { id: body.supplier_id }, select: { address: true } });
    return supplier?.address?.trim() || null;
  }

  /** Sửa toàn bộ phiếu PENDING (header + dòng). Phiếu đã duyệt phải Bỏ ghi trước. */
  async update(id: string, body: CreateImportOrderInput) {
    if (!body.supplier_id || !body.items?.length) throw new BadRequestException('Thiếu nhà cung cấp hoặc danh sách hàng');
    const order = await this.prisma.importOrder.findUnique({ where: { id } });
    if (!order) throw new NotFoundException('Không tìm thấy phiếu nhập');
    if (order.status !== 'PENDING') throw new BadRequestException('Chỉ sửa phiếu PENDING (phiếu đã duyệt phải bỏ ghi trước)');

    const { hasInvoice, invoiceNo, invoiceSymbol, invoiceDate } = parseInvoice(body);
    if (hasInvoice) await this.assertInvoiceUnique(body.supplier_id, invoiceSymbol, invoiceNo!, id);
    const { lines, subtotal, vatAmount, totalAmount } = buildLines(body, hasInvoice);

    const voucherDate = body.voucher_date ? parseVoucherDate(body.voucher_date) : order.voucherDate;
    await this.periodLock.assertOpen(order.voucherDate);
    await this.periodLock.assertOpen(voucherDate);
    const newNo = body.voucher_no?.trim();
    const voucherNo = newNo && newNo !== order.voucherNo ? await this.vouchers.resolveNo('IMPORT', newNo) : order.voucherNo;
    const purchaseAddress = await this.resolvePurchaseAddress(body, hasInvoice);

    try {
      return await this.prisma.$transaction(async (tx) => {
        await tx.importOrderItem.deleteMany({ where: { importOrderId: id } });
        return tx.importOrder.update({
          where: { id },
          data: {
            voucherNo,
            code: voucherNo,
            voucherDate,
            supplierId: body.supplier_id,
            hasInvoice,
            invoiceNo,
            invoiceSymbol,
            invoiceDate,
            purchaseAddress,
            subtotal,
            vatAmount,
            totalAmount,
            paid: body.paid ?? false,
            note: body.note,
            items: { create: lines },
          },
          include: { items: true },
        });
      });
    } catch (e) {
      this.vouchers.rethrowUnique(e, voucherNo);
    }
  }

  async approve(id: string, approvedById: string) {
    // Đọc chế độ thuế để tính giá vốn lô hàng.
    const settings = await this.tax.getSettings();
    const regime = settings.regime as TaxRegime;

    return await this.prisma.$transaction(async (tx) => {
      const order = await tx.importOrder.findUnique({
        where: { id },
        include: { items: true },
      });
      if (!order || order.status !== 'PENDING') throw new BadRequestException('Chỉ duyệt phiếu PENDING');
      await this.periodLock.assertOpen(order.voucherDate, tx);

      await tx.importOrder.update({
        where: { id },
        data: { status: 'COMPLETED', approvedById },
      });
      if (!order.paid) {
        // Công nợ NCC tăng theo tổng thanh toán (đã gồm VAT).
        await tx.supplier.update({
          where: { id: order.supplierId },
          data: { totalDebt: { increment: order.totalAmount } },
        });
      }
      for (const item of order.items) {
        await tx.ingredient.update({
          where: { id: item.ingredientId },
          data: { currentStock: { increment: item.quantity } },
        });

        // Giá vốn đơn vị theo chế độ thuế:
        // VAT_DEDUCTION → giá chưa thuế; HOUSEHOLD → giá gồm VAT (VAT không được khấu trừ).
        const unitPrice = Number(item.unitPrice);
        const vatRate = (item.vatRate as VatRate | null) ?? null;
        const costPerUnit = computeUnitCost(unitPrice, vatRate, regime);
        const lineTotal = roundVnd(costPerUnit * Number(item.quantity));

        await tx.stockTransaction.create({
          data: {
            ingredientId: item.ingredientId,
            type: 'IMPORT',
            quantity: item.quantity,
            unitPrice: costPerUnit,
            totalPrice: lineTotal,
            unitCost: costPerUnit,
            totalCost: lineTotal,
            referenceId: order.id,
            createdById: approvedById,
            voucherDate: order.voucherDate,
            note: `Nhập kho: ${order.code}`,
          },
        });
        await tx.ingredientBatch.create({
          data: {
            ingredientId: item.ingredientId,
            importOrderItemId: item.id,
            batchCode: `${order.code}-${item.id.slice(0, 4)}`,
            quantity: item.quantity,
            costPerUnit,
            expiryDate: item.expiryDate,
            receivedDate: new Date(),
          },
        });
      }
      if (order.purchaseOrderId) await applyReceiptToPo(tx, order.purchaseOrderId, order.items);
      return { message: 'Đã duyệt phiếu nhập' };
    });
  }

  async reject(id: string, reason?: string) {
    const order = await this.prisma.importOrder.findUnique({ where: { id } });
    if (!order || order.status !== 'PENDING') throw new BadRequestException('Chỉ từ chối phiếu PENDING');
    await this.periodLock.assertOpen(order.voucherDate);
    await this.prisma.importOrder.update({
      where: { id },
      data: { status: 'REJECTED', note: reason || order.note },
    });
    return { message: 'Đã từ chối phiếu nhập' };
  }
}
