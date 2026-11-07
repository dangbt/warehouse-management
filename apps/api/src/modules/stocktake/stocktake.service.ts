import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CostingService } from '../costing/costing.service';
import { VoucherService, parseVoucherDate } from '../common/voucher.service';
import { WarehouseStockService } from '../common/warehouse-stock.service';
import { PeriodLockService } from '../common/period-lock.service';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class StocktakeService {
  constructor(
    private prisma: PrismaService,
    private vouchers: VoucherService,
    private costing: CostingService,
    private periodLock: PeriodLockService,
    private stock: WarehouseStockService,
  ) {}

  async findAll(q: { page?: string; limit?: string; warehouse_id?: string }) {
    const page = +(q.page || 1),
      limit = +(q.limit || 20);
    const where = q.warehouse_id ? { warehouseId: q.warehouse_id } : {};
    const [data, total] = await Promise.all([
      this.prisma.stocktakeSession.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [{ voucherDate: 'desc' }, { createdAt: 'desc' }],
        include: { createdBy: { select: { id: true, fullName: true } }, _count: { select: { items: true } } },
      }),
      this.prisma.stocktakeSession.count({ where }),
    ]);
    return { data, meta: { page, limit, total } };
  }

  async getDetail(id: string) {
    const session = await this.prisma.stocktakeSession.findUnique({
      where: { id },
      include: {
        createdBy: { select: { id: true, fullName: true } },
        items: { include: { ingredient: { select: { id: true, name: true, unit: true, costPerUnit: true } } } },
      },
    });
    if (!session) throw new NotFoundException('Không tìm thấy phiên kiểm kho');
    return session;
  }

  async create(userId: string, body: { note?: string; voucher_date?: string; voucher_no?: string; warehouse_id?: string }) {
    // Kiểm kê theo kho: tồn hệ thống = tồn tại kho được kiểm (bỏ trống ⇒ kho mặc định).
    const warehouseId = await this.stock.resolveId(body.warehouse_id);
    const [all, stocks] = await Promise.all([
      this.prisma.ingredient.findMany({ select: { id: true } }),
      this.prisma.ingredientStock.findMany({ where: { warehouseId }, select: { ingredientId: true, qty: true } }),
    ]);
    const qtyById = new Map(stocks.map((s) => [s.ingredientId, s.qty]));
    const ingredients = all.map((i) => ({ id: i.id, currentStock: qtyById.get(i.id) ?? new Decimal(0) }));

    const voucherDate = parseVoucherDate(body.voucher_date);
    await this.periodLock.assertOpen(voucherDate);
    const voucherNo = await this.vouchers.resolveNo('STOCKTAKE', body.voucher_no);

    return this.prisma.stocktakeSession
      .create({
        data: {
          code: voucherNo,
          voucherNo,
          voucherDate,
          warehouseId,
          note: body.note,
          createdById: userId,
          items: {
            create: ingredients.map((ing) => ({
              ingredientId: ing.id,
              systemQty: ing.currentStock,
              actualQty: ing.currentStock,
              difference: 0,
            })),
          },
        },
        include: { items: true },
      })
      .catch((e) => this.vouchers.rethrowUnique(e, voucherNo));
  }

  async updateItems(id: string, body: { items: { ingredientId: string; actualQty: number; note?: string }[] }) {
    const session = await this.prisma.stocktakeSession.findUnique({ where: { id } });
    if (!session) throw new NotFoundException('Không tìm thấy phiên kiểm kho');
    if (session.status !== 'DRAFT') throw new BadRequestException('Chỉ cập nhật phiên ở trạng thái DRAFT');
    await this.periodLock.assertOpen(session.voucherDate);

    for (const item of body.items) {
      const existing = await this.prisma.stocktakeItem.findFirst({
        where: { sessionId: id, ingredientId: item.ingredientId },
      });
      if (!existing) continue;

      const difference = new Decimal(item.actualQty).minus(existing.systemQty);
      await this.prisma.stocktakeItem.update({
        where: { id: existing.id },
        data: { actualQty: item.actualQty, difference, note: item.note },
      });
    }

    return { message: 'Cập nhật thành công' };
  }

  async complete(id: string, userId: string) {
    const session = await this.prisma.stocktakeSession.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!session) throw new NotFoundException('Không tìm thấy phiên kiểm kho');
    if (session.status !== 'DRAFT') throw new BadRequestException('Phiên đã hoàn thành');
    await this.periodLock.assertOpen(session.voucherDate);

    await this.prisma.$transaction(async (tx) => {
      for (const item of session.items) {
        const diff = Number(item.difference);
        if (diff === 0) continue;

        // Giá vốn điều chỉnh: giảm → giá xuất theo phương pháp; tăng → nhập theo giá vốn hiện hành của NL
        const absDiff = Math.abs(diff);
        const cost =
          diff < 0
            ? await this.costing.costOutbound(tx, item.ingredientId, absDiff)
            : await this.costing.currentCost(tx, item.ingredientId, absDiff);

        await this.stock.setQty(tx, item.ingredientId, session.warehouseId, item.actualQty);

        await tx.stockTransaction.create({
          data: {
            ingredientId: item.ingredientId,
            warehouseId: session.warehouseId,
            type: 'STOCKTAKE_ADJUST',
            quantity: item.difference,
            unitCost: cost.unitCost,
            totalCost: cost.totalCost,
            referenceId: session.id,
            createdById: userId,
            voucherDate: session.voucherDate,
            note: `Kiểm kho: ${session.code}`,
          },
        });

        // Adjust batches: add to or deduct from latest batch
        if (diff > 0) {
          const latestBatch = await tx.ingredientBatch.findFirst({
            where: { ingredientId: item.ingredientId, warehouseId: session.warehouseId, status: 'ACTIVE' },
            orderBy: { receivedDate: 'desc' },
          });
          if (latestBatch) {
            await tx.ingredientBatch.update({
              where: { id: latestBatch.id },
              data: { quantity: { increment: diff } },
            });
          }
        } else {
          // diff < 0, deduct from latest batch (LIFO for adjustment)
          const deductQty = Math.abs(diff);
          let remaining = deductQty;
          const batches = await tx.ingredientBatch.findMany({
            where: { ingredientId: item.ingredientId, warehouseId: session.warehouseId, status: 'ACTIVE', quantity: { gt: 0 } },
            orderBy: { receivedDate: 'desc' },
          });

          for (const batch of batches) {
            if (remaining <= 0) break;
            const available = Number(batch.quantity);
            const deduct = Math.min(available, remaining);
            await tx.ingredientBatch.update({
              where: { id: batch.id },
              data: {
                quantity: { decrement: deduct },
                status: available - deduct <= 0 ? 'DEPLETED' : 'ACTIVE',
              },
            });
            remaining -= deduct;
          }
        }
      }

      await tx.stocktakeSession.update({
        where: { id },
        data: { status: 'COMPLETED', completedAt: new Date() },
      });
    });

    return { message: 'Hoàn thành kiểm kho' };
  }
}
