import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { formatVoucherNo, maxSequence } from '../common/voucher.service';
import { groupBySupplier, remainingQty } from './purchase-logic';

const num = (v: unknown) => Number(v ?? 0);
const PO_PREFIX = 'DMH';

@Injectable()
export class PurchaseOrdersService {
  constructor(private prisma: PrismaService) {}

  async findAll(q: { page?: string; limit?: string; status?: string; supplier_id?: string }) {
    const page = +(q.page || 1),
      limit = +(q.limit || 20);
    const where: { status?: string; supplierId?: string } = {};
    if (q.status) where.status = q.status;
    if (q.supplier_id) where.supplierId = q.supplier_id;
    const [data, total] = await Promise.all([
      this.prisma.purchaseOrder.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { supplier: true, items: { include: { ingredient: true } } },
      }),
      this.prisma.purchaseOrder.count({ where }),
    ]);
    return { data, meta: { page, limit, total } };
  }

  async findOne(id: string) {
    const po = await this.prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        supplier: true,
        items: { include: { ingredient: true } },
        importOrders: { select: { id: true, code: true, status: true } },
      },
    });
    if (!po) throw new NotFoundException('Không tìm thấy đơn mua hàng');
    return po;
  }

  /** Tách đề nghị đã duyệt thành các PO, mỗi NCC một PO. Dòng chưa có NCC ⇒ báo lỗi. */
  async createFromRequest(requestId: string, userId: string) {
    const req = await this.prisma.purchaseRequest.findUnique({ where: { id: requestId }, include: { items: true } });
    if (!req) throw new NotFoundException('Không tìm thấy đề nghị');
    if (req.status !== 'APPROVED') throw new BadRequestException('Chỉ tách PO từ đề nghị đã duyệt');
    const { groups, missing } = groupBySupplier(req.items);
    if (missing.length) throw new BadRequestException('Còn dòng chưa chọn nhà cung cấp, không thể tách PO');

    const created: { id: string; code: string }[] = [];
    await this.prisma.$transaction(async (tx) => {
      const rows = await tx.purchaseOrder.findMany({ where: { code: { startsWith: PO_PREFIX } }, select: { code: true } });
      let seq = maxSequence(
        PO_PREFIX,
        rows.map((r) => r.code),
      );
      for (const [supplierId, lines] of groups) {
        seq += 1;
        const po = await tx.purchaseOrder.create({
          data: {
            code: formatVoucherNo(PO_PREFIX, seq, 5),
            supplierId,
            requestId: req.id,
            createdById: userId,
            totalAmount: lines.reduce((s, l) => s + num(l.quantity) * num(l.unitPrice), 0),
            items: {
              create: lines.map((l) => ({
                ingredientId: l.ingredientId,
                quantity: l.quantity,
                buyUnit: l.buyUnit,
                buyFactor: l.buyFactor,
                unitPrice: l.unitPrice,
              })),
            },
          },
        });
        created.push({ id: po.id, code: po.code });
      }
      await tx.purchaseRequest.update({ where: { id: req.id }, data: { status: 'CONVERTED' } });
    });
    return { orders: created };
  }

  async cancel(id: string) {
    const po = await this.prisma.purchaseOrder.findUnique({ where: { id } });
    if (!po) throw new NotFoundException('Không tìm thấy đơn mua hàng');
    if (po.status !== 'UNRECEIVED') throw new BadRequestException('Chỉ huỷ đơn chưa nhận hàng');
    await this.prisma.purchaseOrder.update({ where: { id }, data: { status: 'CANCELLED' } });
    return { message: 'Đã huỷ đơn mua hàng' };
  }

  /** Dữ liệu điền sẵn form nhập kho: các dòng còn lại cần nhận. */
  async receiptDraft(id: string) {
    const po = await this.findOne(id);
    if (po.status === 'CANCELLED' || po.status === 'RECEIVED') throw new BadRequestException('Đơn đã huỷ hoặc đã nhận đủ');
    const items = po.items
      .map((i) => ({
        ingredientId: i.ingredientId,
        name: i.ingredient.name,
        unit: i.ingredient.unit,
        quantity: remainingQty(num(i.quantity), num(i.receivedQty)),
        unitPrice: num(i.unitPrice),
      }))
      .filter((i) => i.quantity > 0);
    return { purchaseOrderId: po.id, code: po.code, supplierId: po.supplierId, items };
  }
}
