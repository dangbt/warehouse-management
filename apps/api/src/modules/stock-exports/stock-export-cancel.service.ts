import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PeriodLockService } from '../common/period-lock.service';

/** Huỷ chứng từ xuất kho: trả lại lô + tồn đã trừ, giữ dòng giao dịch (SL=0), đánh dấu CANCELLED (giữ bản ghi). */
@Injectable()
export class StockExportCancelService {
  constructor(
    private prisma: PrismaService,
    private periodLock: PeriodLockService,
  ) {}

  async cancel(id: string) {
    return this.prisma.$transaction(async (tx) => {
      const voucher = await tx.stockExport.findUnique({ where: { id }, include: { transactions: true } });
      if (!voucher) throw new NotFoundException('Không tìm thấy phiếu xuất');
      if (voucher.status !== 'POSTED') throw new BadRequestException('Phiếu xuất đã huỷ');
      await this.periodLock.assertOpen(voucher.voucherDate, tx);

      for (const t of voucher.transactions) {
        const qty = Math.abs(Number(t.quantity));
        await tx.ingredient.update({ where: { id: t.ingredientId }, data: { currentStock: { increment: qty } } });
        // referenceId = lô đã bị trừ; lô cũ có thể không còn ⇒ chỉ cộng lại khi tồn tại.
        if (t.referenceId) {
          await tx.ingredientBatch.updateMany({ where: { id: t.referenceId }, data: { quantity: { increment: qty }, status: 'ACTIVE' } });
        }
      }
      // Giữ dòng giao dịch để phiếu vẫn hiện trong danh sách; về 0 nên không ảnh hưởng báo cáo tồn/giá vốn.
      for (const t of voucher.transactions) {
        await tx.stockTransaction.update({
          where: { id: t.id },
          data: { quantity: 0, totalCost: 0, note: `[ĐÃ HUỶ - SL gốc ${Math.abs(Number(t.quantity))}] ${t.note ?? ''}`.trim() },
        });
      }
      await tx.stockExport.update({ where: { id }, data: { status: 'CANCELLED' } });
      return { message: 'Đã huỷ phiếu xuất', id, status: 'CANCELLED' };
    });
  }
}
