import { withWarehouseStock } from '../common/warehouse-stock-view';
import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { formatVoucherNo, maxSequence } from '../common/voucher.service';
import { DEFAULT_SAFETY_FACTOR, pickLastPurchase, suggestQuantity } from './purchase-logic';

export interface PurchaseRequestItemInput {
  ingredient_id: string;
  quantity: number;
  buy_unit?: string;
  buy_factor?: number;
  supplier_id?: string;
  unit_price?: number;
}

export interface CreatePurchaseRequestInput {
  note?: string;
  items: PurchaseRequestItemInput[];
}

const num = (v: unknown) => Number(v ?? 0);

@Injectable()
export class PurchaseRequestsService {
  constructor(private prisma: PrismaService) {}

  private async nextCode(): Promise<string> {
    const rows = await this.prisma.purchaseRequest.findMany({ where: { code: { startsWith: 'DNMH' } }, select: { code: true } });
    return formatVoucherNo(
      'DNMH',
      maxSequence(
        'DNMH',
        rows.map((r) => r.code),
      ) + 1,
      5,
    );
  }

  async findAll(q: { page?: string; limit?: string; status?: string }) {
    const page = +(q.page || 1),
      limit = +(q.limit || 20);
    const where = q.status ? { status: q.status } : {};
    const [data, total] = await Promise.all([
      this.prisma.purchaseRequest.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { items: { include: { ingredient: true, supplier: true } }, orders: { select: { id: true, code: true } } },
      }),
      this.prisma.purchaseRequest.count({ where }),
    ]);
    return { data, meta: { page, limit, total } };
  }

  /**
   * Gợi ý từ tồn thấp: NL track tồn có currentStock < minStock.
   * SL = (minStock × hệ số − tồn) làm tròn lên theo ĐVT mua mặc định; NCC/giá = lần nhập đã duyệt gần nhất.
   */
  async suggestLowStock(safetyFactor?: string, warehouseId?: string) {
    const factor = safetyFactor ? Number(safetyFactor) : DEFAULT_SAFETY_FACTOR;
    if (!(factor > 0)) throw new BadRequestException('Hệ số an toàn phải > 0');

    const base = await this.prisma.ingredient.findMany({
      where: { trackStock: true, minStock: { gt: 0 } },
      include: { units: { where: { isDefaultBuy: true }, take: 1 } },
      orderBy: { name: 'asc' },
    });
    const all = warehouseId ? await withWarehouseStock(this.prisma, base, warehouseId) : base;
    const low = all.filter((i) => num(i.currentStock) < num(i.minStock));
    if (!low.length) return { safetyFactor: factor, items: [] };

    const imports = await this.prisma.importOrderItem.findMany({
      where: { ingredientId: { in: low.map((i) => i.id) }, importOrder: { status: 'COMPLETED' } },
      select: { ingredientId: true, unitPrice: true, importOrder: { select: { supplierId: true, voucherDate: true } } },
    });
    const byIng = new Map<string, { supplierId: string; unitPrice: number; at: number }[]>();
    for (const r of imports) {
      const arr = byIng.get(r.ingredientId) ?? [];
      arr.push({ supplierId: r.importOrder.supplierId, unitPrice: num(r.unitPrice), at: r.importOrder.voucherDate.getTime() });
      byIng.set(r.ingredientId, arr);
    }

    const items = low.map((i) => {
      const buy = i.units[0];
      const buyFactor = buy ? num(buy.factor) : 1;
      const last = pickLastPurchase(byIng.get(i.id) ?? []);
      return {
        ingredientId: i.id,
        name: i.name,
        unit: i.unit,
        minStock: num(i.minStock),
        currentStock: num(i.currentStock),
        buyUnit: buy?.unitName ?? null,
        buyFactor,
        quantity: suggestQuantity(num(i.minStock), num(i.currentStock), factor, buyFactor),
        supplierId: last?.supplierId ?? null,
        unitPrice: last?.unitPrice ?? 0,
      };
    });
    return { safetyFactor: factor, items: items.filter((x) => x.quantity > 0) };
  }

  async create(userId: string, body: CreatePurchaseRequestInput) {
    if (!body.items?.length) throw new BadRequestException('Đề nghị phải có ít nhất 1 dòng');
    for (const i of body.items) {
      if (!i.ingredient_id || !(i.quantity > 0) || (i.unit_price ?? 0) < 0) throw new BadRequestException('Dữ liệu dòng không hợp lệ');
    }
    return this.prisma.purchaseRequest.create({
      data: {
        code: await this.nextCode(),
        note: body.note,
        createdById: userId,
        items: {
          create: body.items.map((i) => ({
            ingredientId: i.ingredient_id,
            quantity: i.quantity,
            buyUnit: i.buy_unit || null,
            buyFactor: i.buy_factor && i.buy_factor > 0 ? i.buy_factor : 1,
            supplierId: i.supplier_id || null,
            unitPrice: i.unit_price ?? 0,
          })),
        },
      },
      include: { items: true },
    });
  }

  async approve(id: string, userId: string) {
    const r = await this.prisma.purchaseRequest.findUnique({ where: { id }, include: { items: true } });
    if (!r) throw new NotFoundException('Không tìm thấy đề nghị');
    if (r.status !== 'DRAFT') throw new BadRequestException('Chỉ duyệt đề nghị ở trạng thái nháp');
    await this.prisma.purchaseRequest.update({ where: { id }, data: { status: 'APPROVED', approvedById: userId } });
    return { message: 'Đã duyệt đề nghị mua hàng' };
  }

  async reject(id: string) {
    const r = await this.prisma.purchaseRequest.findUnique({ where: { id } });
    if (!r) throw new NotFoundException('Không tìm thấy đề nghị');
    if (r.status !== 'DRAFT') throw new BadRequestException('Chỉ từ chối đề nghị ở trạng thái nháp');
    await this.prisma.purchaseRequest.update({ where: { id }, data: { status: 'REJECTED' } });
    return { message: 'Đã từ chối đề nghị mua hàng' };
  }
}
