import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TaxService } from '../tax/tax.service';
import { VAT_RATES, VatRate, vatRatePercent, computeUnitCost, TaxRegime } from '../tax/vat';

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
  paid?: boolean;
  has_invoice?: boolean;
  invoice_no?: string;
  invoice_symbol?: string;
  invoice_date?: string;
  items: ImportOrderItemInput[];
}

/** Làm tròn tiền thuế về đồng (0 chữ số thập phân). */
export function roundVnd(value: number): number {
  return Math.round(value);
}

/**
 * Tính tiền thuế VAT của một dòng (đã làm tròn về đồng).
 * `vatRate` null ⇒ 0. Áp dụng phần trăm thuế suất lên `totalPrice` (giá chưa thuế).
 */
export function computeLineVat(totalPrice: number, vatRate: VatRate | null): number {
  if (vatRate == null) return 0;
  return roundVnd((totalPrice * vatRatePercent(vatRate)) / 100);
}

@Injectable()
export class ImportOrdersService {
  constructor(
    private prisma: PrismaService,
    private tax: TaxService,
  ) {}

  async findAll(q: { page?: string; limit?: string; status?: string }) {
    const page = +(q.page || 1),
      limit = +(q.limit || 20);
    const where: { status?: string } = q.status ? { status: q.status } : {};
    const [data, total] = await Promise.all([
      this.prisma.importOrder.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { supplier: true, items: { include: { ingredient: true } } },
      }),
      this.prisma.importOrder.count({ where }),
    ]);
    return { data, meta: { page, limit, total } };
  }

  async create(userId: string, body: CreateImportOrderInput) {
    if (!body.supplier_id || !body.items?.length) throw new BadRequestException('Thiếu nhà cung cấp hoặc danh sách hàng');

    const hasInvoice = body.has_invoice ?? false;
    let invoiceNo: string | null = null;
    let invoiceSymbol: string | null = null;
    let invoiceDate: Date | null = null;

    if (hasInvoice) {
      if (!body.invoice_no?.trim()) throw new BadRequestException('Thiếu số hoá đơn');
      if (!body.invoice_date) throw new BadRequestException('Thiếu ngày hoá đơn');
      invoiceNo = body.invoice_no.trim();
      invoiceSymbol = body.invoice_symbol?.trim() || null;
      invoiceDate = new Date(body.invoice_date);
      if (isNaN(invoiceDate.getTime())) throw new BadRequestException('Ngày hoá đơn không hợp lệ');

      // Chống trùng hoá đơn: cùng NCC + ký hiệu + số HĐ, bỏ qua phiếu đã bị từ chối.
      const dup = await this.prisma.importOrder.findFirst({
        where: {
          supplierId: body.supplier_id,
          invoiceSymbol,
          invoiceNo,
          status: { not: 'REJECTED' },
        },
        select: { code: true },
      });
      if (dup) throw new BadRequestException(`Hoá đơn đã được nhập ở phiếu ${dup.code}`);
    }

    for (const item of body.items) {
      if (!item.ingredient_id || item.quantity <= 0 || item.unit_price < 0) throw new BadRequestException('Dữ liệu item không hợp lệ');
      if (item.factor != null && item.factor <= 0) throw new BadRequestException('Hệ số quy đổi đơn vị phải > 0');
      if (hasInvoice) {
        if (!item.vat_rate || !(VAT_RATES as readonly string[]).includes(item.vat_rate)) {
          throw new BadRequestException('Thuế suất VAT không hợp lệ');
        }
      }
    }

    // Quy đổi về đơn vị tồn: baseQty = quantity × factor.
    const lines = body.items.map((i) => {
      const baseQty = i.quantity * (i.factor ?? 1);
      const totalPrice = baseQty * i.unit_price;
      const vatRate: VatRate | null = hasInvoice ? (i.vat_rate as VatRate) : null;
      return {
        ingredientId: i.ingredient_id,
        quantity: baseQty,
        unitPrice: i.unit_price,
        totalPrice,
        vatRate,
        vatAmount: computeLineVat(totalPrice, vatRate),
        expiryDate: i.expiry_date ? new Date(i.expiry_date) : null,
      };
    });

    const code = `PN-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String(Date.now()).slice(-4)}`;
    const subtotal = lines.reduce((s, l) => s + l.totalPrice, 0);
    const vatAmount = lines.reduce((s, l) => s + l.vatAmount, 0);
    const totalAmount = subtotal + vatAmount;

    return await this.prisma.importOrder.create({
      data: {
        code,
        supplierId: body.supplier_id,
        hasInvoice,
        invoiceNo,
        invoiceSymbol,
        invoiceDate,
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
            referenceId: order.id,
            createdById: approvedById,
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
      return { message: 'Đã duyệt phiếu nhập' };
    });
  }

  async reject(id: string, reason?: string) {
    const order = await this.prisma.importOrder.findUnique({ where: { id } });
    if (!order || order.status !== 'PENDING') throw new BadRequestException('Chỉ từ chối phiếu PENDING');
    await this.prisma.importOrder.update({
      where: { id },
      data: { status: 'REJECTED', note: reason || order.note },
    });
    return { message: 'Đã từ chối phiếu nhập' };
  }
}
