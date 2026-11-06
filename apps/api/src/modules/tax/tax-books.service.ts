import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { parsePeriod } from './period';
import { TaxSummaryService } from './tax-summary.service';
import { buildMaterialsBookEntry, normalizeMovement } from './materials-book';
import type { MaterialsBookEntry } from './materials-book';

/** Một dòng sổ doanh thu bán hàng (mỗi ngày có phát sinh một dòng). */
export interface RevenueBookRow {
  /** Ngày (ISO, mốc 00:00 giờ VN của ngày đó). */
  date: string;
  /** Diễn giải: "Doanh thu bán hàng ngày dd/MM". */
  description: string;
  /** Doanh thu trong ngày = Σ totalAmount đơn KiotViet của ngày. */
  amount: number;
}

/**
 * Sổ chi tiết doanh thu bán hàng hoá, dịch vụ — mẫu S1-HKD.
 * Kèm số thuế GTGT/TNCN phải nộp của kỳ (lấy từ tổng hợp thuế TASK-154).
 */
export interface RevenueBookReport {
  period: { value: string; label: string };
  settings: { companyName: string | null; taxCode: string | null };
  rows: RevenueBookRow[];
  total: { amount: number };
  /** Thuế phải nộp trong kỳ (chỉ có ý nghĩa với hộ kinh doanh). */
  tax: { regime: string; vat: number; pit: number };
}

/** Sổ chi tiết vật liệu, dụng cụ, sản phẩm, hàng hoá — mẫu S2-HKD. */
export interface MaterialsBookReport {
  period: { value: string; label: string };
  settings: { companyName: string | null; taxCode: string | null };
  entries: MaterialsBookEntry[];
}

/**
 * Lập các sổ kế toán hộ kinh doanh theo Thông tư 88/2021/TT-BTC:
 * - S1-HKD: sổ chi tiết doanh thu bán hàng hoá, dịch vụ.
 * - S2-HKD: sổ chi tiết vật liệu, dụng cụ, sản phẩm, hàng hoá (nhập – xuất – tồn).
 */
@Injectable()
export class TaxBooksService {
  constructor(
    private prisma: PrismaService,
    private summaryService: TaxSummaryService,
  ) {}

  /**
   * Sổ doanh thu: mỗi ngày có đơn hàng ⇒ một dòng `{ date, description, amount }`.
   * Doanh thu ngày = Σ `KiotVietOrder.totalAmount` (khớp báo cáo doanh thu TASK-153,
   * độc lập snapshot thuế). Tổng kỳ + số thuế phải nộp lấy từ tổng hợp thuế TASK-154.
   */
  async revenueBook(periodValue: string | undefined): Promise<RevenueBookReport> {
    const period = parsePeriod(periodValue);
    const value = periodValue!;

    const [setting, orders, summary] = await Promise.all([
      this.prisma.taxSetting.findUnique({ where: { id: 'default' } }),
      this.prisma.kiotVietOrder.findMany({
        // `orderDate` là cột timestamp ⇒ dùng from/to (ranh giới ngày theo giờ VN).
        where: { orderDate: { gte: period.from, lte: period.to } },
        select: { totalAmount: true, orderDate: true },
        orderBy: { orderDate: 'asc' },
      }),
      this.summaryService.summary(value),
    ]);

    // Gom doanh thu theo từng ngày (theo lịch giờ VN).
    const byDay = new Map<string, number>();
    for (const order of orders) {
      const dayKey = this.vnDayKey(order.orderDate);
      byDay.set(dayKey, (byDay.get(dayKey) ?? 0) + Number(order.totalAmount));
    }

    const rows: RevenueBookRow[] = [...byDay.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([dayKey, amount]) => {
        // dayKey = 'YYYY-MM-DD' theo giờ VN ⇒ mốc 00:00 giờ VN quy về UTC.
        const [y, m, d] = dayKey.split('-').map(Number);
        const date = new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0) - 7 * 60 * 60 * 1000);
        return {
          date: date.toISOString(),
          description: `Doanh thu bán hàng ngày ${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}`,
          amount,
        };
      });

    const total = { amount: rows.reduce((s, r) => s + r.amount, 0) };

    // Thuế phải nộp: hộ kinh doanh có vat/pit; VAT khấu trừ không áp dụng khái niệm này ⇒ 0.
    const tax =
      summary.regime === 'HOUSEHOLD'
        ? { regime: summary.regime, vat: summary.vat, pit: summary.pit }
        : { regime: summary.regime, vat: 0, pit: 0 };

    return {
      period: { value, label: period.label },
      settings: { companyName: setting?.companyName ?? null, taxCode: setting?.taxCode ?? null },
      rows,
      total,
      tax,
    };
  }

  /**
   * Sổ vật liệu, hàng hoá: với mỗi nguyên liệu, tính tồn đầu kỳ (SL + giá trị),
   * liệt kê phát sinh nhập/xuất trong kỳ, và tồn cuối kỳ = tồn đầu + nhập − xuất.
   *
   * Tồn đầu kỳ = Σ phát sinh (theo chiều IN/OUT) của mọi giao dịch `createdAt < from`.
   * Giá trị phát sinh không có `totalPrice` (vd EXPORT) suy ra bằng SL × giá vốn bình
   * quân của nguyên liệu (`Ingredient.costPerUnit`) — xem `normalizeMovement`.
   *
   * @param ingredientId Lọc theo một nguyên liệu; bỏ trống ⇒ tất cả nguyên liệu có phát sinh/tồn.
   */
  async materialsBook(periodValue: string | undefined, ingredientId?: string): Promise<MaterialsBookReport> {
    const period = parsePeriod(periodValue);
    const value = periodValue!;

    const ingredientWhere = ingredientId ? { id: ingredientId } : {};
    const [setting, ingredients] = await Promise.all([
      this.prisma.taxSetting.findUnique({ where: { id: 'default' } }),
      this.prisma.ingredient.findMany({
        where: ingredientWhere,
        select: { id: true, name: true, unit: true, costPerUnit: true },
        orderBy: { name: 'asc' },
      }),
    ]);

    const entries: MaterialsBookEntry[] = [];
    for (const ing of ingredients) {
      const avgCost = Number(ing.costPerUnit);

      // Phát sinh trước kỳ (để tính tồn đầu) và trong kỳ (để lập dòng sổ).
      const [before, during] = await Promise.all([
        this.prisma.stockTransaction.findMany({
          where: { ingredientId: ing.id, createdAt: { lt: period.from } },
          select: { type: true, quantity: true, totalPrice: true, note: true, referenceId: true, createdAt: true },
        }),
        this.prisma.stockTransaction.findMany({
          where: { ingredientId: ing.id, createdAt: { gte: period.from, lte: period.to } },
          select: { type: true, quantity: true, totalPrice: true, note: true, referenceId: true, createdAt: true },
          orderBy: { createdAt: 'asc' },
        }),
      ]);

      // Tồn đầu kỳ = cộng dồn phát sinh trước kỳ theo chiều.
      let openingQty = 0;
      let openingValue = 0;
      for (const tx of before) {
        const m = normalizeMovement(this.toMovementInput(tx), avgCost);
        if (m.direction === 'IN') {
          openingQty += m.quantity;
          openingValue += m.value;
        } else {
          openingQty -= m.quantity;
          openingValue -= m.value;
        }
      }

      const movements = during.map((tx) => normalizeMovement(this.toMovementInput(tx), avgCost));

      // Bỏ qua nguyên liệu không tồn đầu và không phát sinh trong kỳ (khi lấy tất cả).
      if (!ingredientId && movements.length === 0 && openingQty === 0 && openingValue === 0) {
        continue;
      }

      entries.push(buildMaterialsBookEntry({ id: ing.id, name: ing.name, unit: ing.unit }, openingQty, openingValue, movements));
    }

    return {
      period: { value, label: period.label },
      settings: { companyName: setting?.companyName ?? null, taxCode: setting?.taxCode ?? null },
      entries,
    };
  }

  /** Chuyển bản ghi Prisma (Decimal) về input số cho `normalizeMovement`. */
  private toMovementInput(tx: {
    type: string;
    quantity: unknown;
    totalPrice: unknown;
    note: string | null;
    referenceId: string | null;
    createdAt: Date;
  }): { type: string; quantity: number; totalPrice: number | null; note: string | null; referenceId: string | null; createdAt: string } {
    return {
      type: tx.type,
      quantity: Number(tx.quantity),
      totalPrice: tx.totalPrice == null ? null : Number(tx.totalPrice),
      note: tx.note,
      referenceId: tx.referenceId,
      createdAt: tx.createdAt.toISOString(),
    };
  }

  /** Khoá ngày 'YYYY-MM-DD' theo lịch giờ Việt Nam (UTC+7) của một mốc thời gian. */
  private vnDayKey(date: Date): string {
    const vn = new Date(date.getTime() + 7 * 60 * 60 * 1000);
    const y = vn.getUTCFullYear();
    const m = String(vn.getUTCMonth() + 1).padStart(2, '0');
    const d = String(vn.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
}
