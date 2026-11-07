import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BatchDeductionService } from '../common/batch-deduction.service';
import { PeriodLockService } from '../common/period-lock.service';
import { WarehouseStockService } from '../common/warehouse-stock.service';

export const TRANSFER_UNPOST_BATCH_USED = 'TRANSFER_UNPOST_BATCH_USED';

/** Gộp SL theo nguyên liệu (một NL có thể xuất hiện nhiều dòng). Hàm thuần để dễ kiểm thử. */
export function sumByIngredient(items: { ingredientId: string; quantity: unknown }[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const i of items) m.set(i.ingredientId, (m.get(i.ingredientId) ?? 0) + Number(i.quantity));
  return m;
}

/** Duyệt (ghi sổ) và bỏ ghi phiếu chuyển kho: trừ lô kho nguồn, tạo lô tương ứng ở kho đích (giữ HSD + giá vốn). */
@Injectable()
export class StockTransferPostService {
  constructor(
    private prisma: PrismaService,
    private periodLock: PeriodLockService,
    private batchDeduction: BatchDeductionService,
    private stock: WarehouseStockService,
  ) {}

  async approve(id: string, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      const t = await tx.stockTransfer.findUnique({
        where: { id },
        include: { items: { include: { ingredient: { select: { name: true } } } } },
      });
      if (!t) throw new NotFoundException('Không tìm thấy phiếu chuyển kho');
      if (t.status !== 'PENDING') throw new BadRequestException('Chỉ duyệt phiếu chờ duyệt');
      await this.periodLock.assertOpen(t.voucherDate, tx);
      await this.stock.resolveId(t.fromWarehouseId, tx);
      await this.stock.resolveId(t.toWarehouseId, tx);

      const names = new Map(t.items.map((i) => [i.ingredientId, i.ingredient.name]));
      for (const [ingredientId, qty] of sumByIngredient(t.items)) {
        const have = await this.stock.getQty(tx, ingredientId, t.fromWarehouseId);
        if (have < qty) throw new BadRequestException(`Không đủ tồn kho nguồn cho ${names.get(ingredientId)} (còn ${have}, cần ${qty})`);
      }

      for (const item of t.items) {
        const qty = Number(item.quantity);
        const deducted = await this.batchDeduction.deductFromBatches(tx, item.ingredientId, qty, t.fromWarehouseId);
        const sources = await tx.ingredientBatch.findMany({ where: { id: { in: deducted.map((d) => d.batchId) } } });
        for (const d of deducted) {
          const src = sources.find((b) => b.id === d.batchId)!;
          const unitCost = Number(src.costPerUnit);
          const totalCost = +(d.qty * unitCost).toFixed(2);
          const dest = await tx.ingredientBatch.create({
            data: {
              ingredientId: item.ingredientId,
              warehouseId: t.toWarehouseId,
              batchCode: src.batchCode,
              quantity: d.qty,
              costPerUnit: src.costPerUnit,
              expiryDate: src.expiryDate,
              receivedDate: src.receivedDate,
              transferId: id,
              note: `Chuyển từ kho nguồn theo ${t.voucherNo}`,
            },
          });
          const base = {
            ingredientId: item.ingredientId,
            unitCost,
            totalCost,
            createdById: userId,
            voucherDate: t.voucherDate,
            transferId: id,
          };
          await tx.stockTransaction.create({
            data: {
              ...base,
              warehouseId: t.fromWarehouseId,
              type: 'TRANSFER_OUT',
              quantity: -d.qty,
              referenceId: d.batchId,
              note: `Chuyển kho ${t.voucherNo}`,
            },
          });
          await tx.stockTransaction.create({
            data: {
              ...base,
              warehouseId: t.toWarehouseId,
              type: 'TRANSFER_IN',
              quantity: d.qty,
              referenceId: dest.id,
              note: `Chuyển kho ${t.voucherNo}`,
            },
          });
        }
        await this.stock.adjust(tx, item.ingredientId, t.fromWarehouseId, -qty);
        await this.stock.adjust(tx, item.ingredientId, t.toWarehouseId, qty);
      }
      await tx.stockTransfer.update({ where: { id }, data: { status: 'COMPLETED' } });
      return { message: 'Đã duyệt phiếu chuyển kho', id, status: 'COMPLETED' };
    });
  }

  /** Bỏ ghi: trả lô về kho nguồn, xoá lô đã tạo ở kho đích (chỉ khi chưa bị dùng), xoá 2 bút toán, về PENDING. */
  async unpost(id: string) {
    return this.prisma.$transaction(async (tx) => {
      const t = await tx.stockTransfer.findUnique({ where: { id }, include: { transactions: true } });
      if (!t) throw new NotFoundException('Không tìm thấy phiếu chuyển kho');
      if (t.status !== 'COMPLETED') throw new BadRequestException('Chỉ bỏ ghi phiếu đã duyệt');
      await this.periodLock.assertOpen(t.voucherDate, tx);

      const ins = t.transactions.filter((x) => x.type === 'TRANSFER_IN');
      const outs = t.transactions.filter((x) => x.type === 'TRANSFER_OUT');
      const destBatches = await tx.ingredientBatch.findMany({ where: { transferId: id } });
      const used = ins.filter((x) => {
        const b = destBatches.find((d) => d.id === x.referenceId);
        return !b || Number(b.quantity) < Math.abs(Number(x.quantity));
      });
      if (used.length) {
        throw new ConflictException({
          statusCode: 409,
          code: TRANSFER_UNPOST_BATCH_USED,
          message: 'Hàng đã chuyển đến kho đích đã được xuất/dùng một phần, không thể bỏ ghi',
        });
      }

      for (const x of ins) await this.stock.adjust(tx, x.ingredientId, t.toWarehouseId, -Math.abs(Number(x.quantity)));
      for (const x of outs) {
        const qty = Math.abs(Number(x.quantity));
        await this.stock.adjust(tx, x.ingredientId, t.fromWarehouseId, qty);
        if (x.referenceId) {
          await tx.ingredientBatch.updateMany({ where: { id: x.referenceId }, data: { quantity: { increment: qty }, status: 'ACTIVE' } });
        }
      }
      await tx.ingredientBatch.deleteMany({ where: { transferId: id } });
      await tx.stockTransaction.deleteMany({ where: { transferId: id } });
      await tx.stockTransfer.update({ where: { id }, data: { status: 'PENDING' } });
      return { message: 'Đã bỏ ghi phiếu chuyển kho', id, status: 'PENDING' };
    });
  }
}
