import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { COSTING_METHODS, CostingMethod, LedgerEntry, costLedger, directionOf, round2, round4 } from './costing-engine';

type Db = Pick<Prisma.TransactionClient, 'stockTransaction' | 'ingredient' | 'inventorySetting'>;

export interface OutboundCost {
  unitCost: number;
  totalCost: number;
}

/** Cấu hình phương pháp tính giá + tính giá vốn cho giao dịch xuất tại thời điểm ghi. */
@Injectable()
export class CostingService {
  constructor(private prisma: PrismaService) {}

  async getMethod(db: Db = this.prisma): Promise<CostingMethod> {
    const s = await db.inventorySetting.findUnique({ where: { id: 'default' } });
    return (COSTING_METHODS.includes(s?.costingMethod as CostingMethod) ? s!.costingMethod : 'AVG_PERIOD') as CostingMethod;
  }

  async getSettings() {
    const [method, txCount] = await Promise.all([this.getMethod(), this.prisma.stockTransaction.count()]);
    return { costingMethod: method, hasTransactions: txCount > 0 };
  }

  /**
   * Đổi phương pháp. Nếu đã có giao dịch kho thì cảnh báo (409-kiểu BadRequest) trừ khi `confirm = true`.
   * TODO WMS-7: chặn hẳn khi đã có kỳ khoá sổ.
   */
  async setMethod(method: string, confirm = false) {
    if (!COSTING_METHODS.includes(method as CostingMethod)) throw new BadRequestException('Phương pháp tính giá không hợp lệ');
    const current = await this.getMethod();
    if (current !== method) {
      const txCount = await this.prisma.stockTransaction.count();
      if (txCount > 0 && !confirm) {
        throw new BadRequestException(
          'Đã có giao dịch kho. Đổi phương pháp tính giá sẽ ảnh hưởng giá vốn các kỳ sau; cần xác nhận (confirm).',
        );
      }
    }
    await this.prisma.inventorySetting.upsert({
      where: { id: 'default' },
      update: { costingMethod: method },
      create: { id: 'default', costingMethod: method },
    });
    return this.getSettings();
  }

  /**
   * Giá vốn xuất `qty` của NL tại thời điểm ghi giao dịch.
   * AVG_PERIOD: ghi tạm giá vốn hiện hành (chốt khi chạy "Tính giá xuất kho"); AVG_MOVING/FIFO: tính ngay trên sổ NL.
   */
  async costOutbound(db: Db, ingredientId: string, qty: number): Promise<OutboundCost> {
    const [method, ing, txs] = await Promise.all([
      this.getMethod(db),
      db.ingredient.findUnique({ where: { id: ingredientId }, select: { costPerUnit: true } }),
      db.stockTransaction.findMany({
        where: { ingredientId },
        select: { id: true, type: true, quantity: true, unitPrice: true, unitCost: true, totalCost: true, totalPrice: true },
        orderBy: [{ voucherDate: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
      }),
    ]);
    const current = Number(ing?.costPerUnit ?? 0);
    const entries: LedgerEntry[] = [];
    for (const t of txs) {
      const q = Number(t.quantity);
      const dir = directionOf(t.type, q);
      if (!dir) continue;
      const total = t.totalCost ?? t.totalPrice;
      entries.push({
        id: t.id,
        direction: dir,
        qty: Math.abs(q),
        totalCost: total != null ? Math.abs(Number(total)) : null,
        inPeriod: false,
      });
    }
    entries.push({ id: '__new__', direction: 'OUT', qty, totalCost: null, inPeriod: true });

    if (method === 'AVG_PERIOD' && current > 0) {
      return { unitCost: round4(current), totalCost: round2(qty * current) };
    }
    // AVG_PERIOD chưa có giá vốn hiện hành → tạm dùng bình quân tức thời
    const result = costLedger(method === 'AVG_PERIOD' ? 'AVG_MOVING' : method, entries, current).get('__new__');
    return result ?? { unitCost: 0, totalCost: 0 };
  }

  /** Giá trị nhập `qty` theo giá vốn hiện hành của NL (dùng cho điều chỉnh tăng khi kiểm kê). */
  async currentCost(db: Db, ingredientId: string, qty: number): Promise<OutboundCost> {
    const ing = await db.ingredient.findUnique({ where: { id: ingredientId }, select: { costPerUnit: true } });
    const unit = Number(ing?.costPerUnit ?? 0);
    return { unitCost: round4(unit), totalCost: round2(qty * unit) };
  }
}
