import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PeriodLockService } from '../common/period-lock.service';

export const IMPORT_UNPOST_NEGATIVE_STOCK = 'IMPORT_UNPOST_NEGATIVE_STOCK';
export const IMPORT_UNPOST_HAS_RETURN = 'IMPORT_UNPOST_HAS_RETURN';

export interface UnpostShortage {
  ingredientId: string;
  ingredientName: string;
  /** Số lượng phiếu đã nhập vào kho. */
  imported: number;
  /** Số lượng còn lại của lô (đã bị xuất một phần ⇒ nhỏ hơn imported). */
  remaining: number;
  /** Phần thiếu nếu đảo phiếu. */
  shortage: number;
}

interface LineLike {
  ingredientId: string;
  quantity: number;
}

/**
 * Tính các nguyên liệu sẽ bị tồn âm nếu đảo phiếu: lô của dòng phiếu đã bị xuất/trả một phần
 * (remaining < imported) hoặc tồn tổng không đủ để trừ lại. Hàm thuần để dễ kiểm thử.
 */
export function findUnpostShortages(
  lines: (LineLike & { batchRemaining: number | null; ingredientName: string })[],
  stockByIngredient: Map<string, number>,
): UnpostShortage[] {
  const out = new Map<string, UnpostShortage>();
  const stockLeft = new Map(stockByIngredient);
  for (const l of lines) {
    const remaining = l.batchRemaining ?? 0;
    const stock = stockLeft.get(l.ingredientId) ?? 0;
    const short = Math.max(l.quantity - remaining, l.quantity - stock);
    stockLeft.set(l.ingredientId, stock - l.quantity);
    if (short <= 0) continue;
    const cur = out.get(l.ingredientId);
    if (cur) {
      cur.imported += l.quantity;
      cur.remaining += remaining;
      cur.shortage += short;
    } else {
      out.set(l.ingredientId, {
        ingredientId: l.ingredientId,
        ingredientName: l.ingredientName,
        imported: l.quantity,
        remaining,
        shortage: short,
      });
    }
  }
  return [...out.values()];
}

/** Bỏ ghi phiếu nhập đã duyệt (đảo tồn, lô, công nợ NCC) và huỷ phiếu chưa ghi sổ. */
@Injectable()
export class ImportOrderUnpostService {
  constructor(
    private prisma: PrismaService,
    private periodLock: PeriodLockService,
  ) {}

  async unpost(id: string) {
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.importOrder.findUnique({
        where: { id },
        include: { items: { include: { batch: true, ingredient: { select: { name: true, currentStock: true } } } } },
      });
      if (!order) throw new NotFoundException('Không tìm thấy phiếu nhập');
      if (order.status !== 'COMPLETED') throw new BadRequestException('Chỉ bỏ ghi phiếu đã duyệt');
      await this.periodLock.assertOpen(order.voucherDate, tx);

      const returns = await tx.purchaseReturn.findMany({ where: { importOrderId: id }, select: { voucherNo: true } });
      if (returns.length) {
        throw new ConflictException({
          statusCode: 409,
          code: IMPORT_UNPOST_HAS_RETURN,
          message: IMPORT_UNPOST_HAS_RETURN,
          returns: returns.map((r) => r.voucherNo),
        });
      }

      const stock = new Map(order.items.map((i) => [i.ingredientId, Number(i.ingredient.currentStock)]));
      const shortages = findUnpostShortages(
        order.items.map((i) => ({
          ingredientId: i.ingredientId,
          ingredientName: i.ingredient.name,
          quantity: Number(i.quantity),
          batchRemaining: i.batch ? Number(i.batch.quantity) : null,
        })),
        stock,
      );
      if (shortages.length) {
        throw new ConflictException({
          statusCode: 409,
          code: IMPORT_UNPOST_NEGATIVE_STOCK,
          message: IMPORT_UNPOST_NEGATIVE_STOCK,
          shortages,
        });
      }

      for (const item of order.items) {
        await tx.ingredient.update({ where: { id: item.ingredientId }, data: { currentStock: { decrement: item.quantity } } });
      }
      await tx.ingredientBatch.deleteMany({ where: { importOrderItemId: { in: order.items.map((i) => i.id) } } });
      await tx.stockTransaction.deleteMany({ where: { type: 'IMPORT', referenceId: id } });
      if (!order.paid) {
        await tx.supplier.update({ where: { id: order.supplierId }, data: { totalDebt: { decrement: order.totalAmount } } });
      }
      // VAT đầu vào của báo cáo thuế chỉ tính phiếu COMPLETED ⇒ trả về PENDING là VAT tự được đảo.
      await tx.importOrder.update({ where: { id }, data: { status: 'PENDING', approvedById: null } });
      return { message: 'Đã bỏ ghi phiếu nhập', id, status: 'PENDING' };
    });
  }

  /** Huỷ mềm phiếu PENDING/REJECTED: giữ lại bản ghi, đổi trạng thái CANCELLED. */
  async cancel(id: string) {
    const order = await this.prisma.importOrder.findUnique({ where: { id } });
    if (!order) throw new NotFoundException('Không tìm thấy phiếu nhập');
    if (order.status !== 'PENDING' && order.status !== 'REJECTED') throw new BadRequestException('Chỉ huỷ phiếu chờ duyệt hoặc đã từ chối');
    await this.periodLock.assertOpen(order.voucherDate);
    await this.prisma.importOrder.update({ where: { id }, data: { status: 'CANCELLED' } });
    return { message: 'Đã huỷ phiếu nhập', id, status: 'CANCELLED' };
  }
}
