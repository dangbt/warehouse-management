import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PeriodLockService } from '../common/period-lock.service';
import { VoucherService, parseVoucherDate } from '../common/voucher.service';
import { WarehouseStockService } from '../common/warehouse-stock.service';
import { voucherDateFilter } from '../common/voucher-date-filter';

export interface CreateStockTransferInput {
  from_warehouse_id: string;
  to_warehouse_id: string;
  voucher_date?: string;
  voucher_no?: string;
  note?: string;
  items: { ingredient_id: string; quantity: number }[];
}

const INCLUDE = {
  fromWarehouse: { select: { id: true, code: true, name: true } },
  toWarehouse: { select: { id: true, code: true, name: true } },
  items: { include: { ingredient: { select: { id: true, name: true, unit: true, sku: true } } } },
  // Giá vốn thực xuất theo lô (chỉ có sau khi duyệt) — dùng cho in phiếu 03-XKNB.
  transactions: { where: { type: 'TRANSFER_OUT' }, select: { ingredientId: true, quantity: true, totalCost: true } },
} as const;

/** CRUD phiếu chuyển kho (chưa ghi sổ). Ghi sổ/bỏ ghi: StockTransferPostService. */
@Injectable()
export class StockTransfersService {
  constructor(
    private prisma: PrismaService,
    private vouchers: VoucherService,
    private periodLock: PeriodLockService,
    private stock: WarehouseStockService,
  ) {}

  async findAll(q: { page?: string; limit?: string; from?: string; to?: string; warehouse_id?: string; status?: string; id?: string }) {
    const page = +(q.page || 1),
      limit = +(q.limit || 20);
    const where: Record<string, unknown> = {};
    if (q.id) where.id = q.id;
    if (q.status) where.status = q.status;
    if (q.warehouse_id) where.OR = [{ fromWarehouseId: q.warehouse_id }, { toWarehouseId: q.warehouse_id }];
    const range = voucherDateFilter(q);
    if (range) where.voucherDate = range;
    const [data, total] = await Promise.all([
      this.prisma.stockTransfer.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [{ voucherDate: 'desc' }, { createdAt: 'desc' }],
        include: INCLUDE,
      }),
      this.prisma.stockTransfer.count({ where }),
    ]);
    return { data, meta: { page, limit, total } };
  }

  async findOne(id: string) {
    const t = await this.prisma.stockTransfer.findUnique({ where: { id }, include: INCLUDE });
    if (!t) throw new NotFoundException('Không tìm thấy phiếu chuyển kho');
    return t;
  }

  async create(userId: string, body: CreateStockTransferInput) {
    if (!body.items?.length) throw new BadRequestException('Phiếu chuyển kho cần ít nhất một dòng');
    if (!body.from_warehouse_id || !body.to_warehouse_id) throw new BadRequestException('Chọn kho nguồn và kho đích');
    if (body.from_warehouse_id === body.to_warehouse_id) throw new BadRequestException('Kho nguồn và kho đích phải khác nhau');
    for (const i of body.items) {
      if (!i.ingredient_id || !(i.quantity > 0)) throw new BadRequestException('Dòng chuyển kho không hợp lệ');
    }
    const fromId = await this.stock.resolveId(body.from_warehouse_id);
    const toId = await this.stock.resolveId(body.to_warehouse_id);
    const voucherDate = parseVoucherDate(body.voucher_date);
    await this.periodLock.assertOpen(voucherDate);
    const voucherNo = await this.vouchers.resolveNo('TRANSFER', body.voucher_no);
    return this.prisma.stockTransfer
      .create({
        data: {
          voucherNo,
          voucherDate,
          fromWarehouseId: fromId,
          toWarehouseId: toId,
          note: body.note,
          createdById: userId,
          items: { create: body.items.map((i) => ({ ingredientId: i.ingredient_id, quantity: i.quantity })) },
        },
        include: INCLUDE,
      })
      .catch((e) => this.vouchers.rethrowUnique(e, voucherNo));
  }

  /** Huỷ mềm phiếu chưa duyệt. */
  async cancel(id: string) {
    const t = await this.findOne(id);
    if (t.status !== 'PENDING') throw new BadRequestException('Chỉ huỷ phiếu chờ duyệt');
    await this.periodLock.assertOpen(t.voucherDate);
    await this.prisma.stockTransfer.update({ where: { id }, data: { status: 'CANCELLED' } });
    return { message: 'Đã huỷ phiếu chuyển kho', id, status: 'CANCELLED' };
  }
}
