import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CostingService } from './costing.service';
import { CostResult, LedgerEntry, costLedger, directionOf, round2, round4 } from './costing-engine';

const VN_OFFSET_MS = 7 * 60 * 60 * 1000;

/** Khoảng [from, to] (UTC) của tháng 'YYYY-MM' theo lịch VN. */
export function monthRange(month: string): { from: Date; to: Date } {
  const m = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(month ?? '');
  if (!m) throw new BadRequestException('Kỳ không hợp lệ (định dạng YYYY-MM)');
  const y = +m[1];
  const mo = +m[2] - 1;
  return {
    from: new Date(Date.UTC(y, mo, 1) - VN_OFFSET_MS),
    to: new Date(Date.UTC(y, mo + 1, 1) - VN_OFFSET_MS - 1),
  };
}

interface Row {
  id: string;
  ingredientId: string;
  type: string;
  qty: number;
  refId: string | null;
  inPeriod: boolean;
  totalCost: number | null;
  unitCost: number | null;
  dirty: boolean;
}

/** Chức năng "Tính giá xuất kho" theo kỳ (tháng): tính lại giá vốn xuất trong kỳ theo phương pháp đang cấu hình. */
@Injectable()
export class CostingPeriodService {
  constructor(
    private prisma: PrismaService,
    private costing: CostingService,
  ) {}

  async run(month: string) {
    const { from, to } = monthRange(month);
    const method = await this.costing.getMethod();

    const inPeriod = await this.prisma.stockTransaction.findMany({
      where: { voucherDate: { gte: from, lte: to } },
      select: { ingredientId: true },
      distinct: ['ingredientId'],
    });
    const ids = inPeriod.map((r) => r.ingredientId);
    if (ids.length === 0) return { month, method, ingredients: 0, processed: 0, updated: 0, totalOutValue: 0 };

    const [txs, ingredients] = await Promise.all([
      this.prisma.stockTransaction.findMany({
        where: { ingredientId: { in: ids }, voucherDate: { lte: to } },
        orderBy: [{ voucherDate: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
      }),
      this.prisma.ingredient.findMany({ where: { id: { in: ids } }, select: { id: true, costPerUnit: true } }),
    ]);
    const fallback = new Map(ingredients.map((i) => [i.id, Number(i.costPerUnit)]));

    const rows = new Map<string, Row[]>();
    for (const t of txs) {
      const total = t.totalCost ?? t.totalPrice;
      const row: Row = {
        id: t.id,
        ingredientId: t.ingredientId,
        type: t.type,
        qty: Number(t.quantity),
        refId: t.referenceId,
        inPeriod: t.voucherDate >= from,
        totalCost: total != null ? Math.abs(Number(total)) : null,
        unitCost: t.unitCost != null ? Number(t.unitCost) : null,
        dirty: false,
      };
      if (!rows.has(t.ingredientId)) rows.set(t.ingredientId, []);
      rows.get(t.ingredientId)!.push(row);
    }

    // PROCESS_IN lấy giá từ PROCESS_OUT cùng phiếu → lặp tới khi ổn định (chế biến chuyền nhiều bước)
    const results = new Map<string, CostResult>();
    for (let pass = 0; pass < 10; pass++) {
      results.clear();
      for (const [ingId, list] of rows) {
        const entries: LedgerEntry[] = [];
        for (const r of list) {
          const dir = directionOf(r.type, r.qty);
          if (!dir) continue;
          // Dòng xuất trong kỳ sẽ được tính lại → bỏ giá cũ; ngoài kỳ giữ giá đã lưu
          entries.push({
            id: r.id,
            direction: dir,
            qty: Math.abs(r.qty),
            totalCost: dir === 'OUT' && r.inPeriod ? null : r.totalCost,
            inPeriod: r.inPeriod,
          });
        }
        for (const [id, res] of costLedger(method, entries, fallback.get(ingId) ?? 0)) results.set(id, res);
      }
      const outByRef = new Map<string, number>();
      for (const list of rows.values()) {
        for (const r of list) {
          if (r.type === 'PROCESS_OUT' && r.inPeriod && r.refId)
            outByRef.set(r.refId, round2((outByRef.get(r.refId) ?? 0) + results.get(r.id)!.totalCost));
        }
      }
      let changed = false;
      for (const list of rows.values()) {
        for (const r of list) {
          if (r.type !== 'PROCESS_IN' || !r.inPeriod || !r.refId || !outByRef.has(r.refId)) continue;
          const total = outByRef.get(r.refId)!;
          if (r.totalCost !== total) {
            r.totalCost = total;
            r.unitCost = r.qty ? round4(total / Math.abs(r.qty)) : 0;
            r.dirty = true;
            changed = true;
          }
        }
      }
      if (!changed) break;
    }

    // Gom thay đổi cần ghi (so với giá đang lưu) → lần chạy lại không còn gì để cập nhật
    const stored = new Map(txs.map((t) => [t.id, t]));
    const updates: { id: string; unitCost: number; totalCost: number }[] = [];
    let processed = 0;
    let totalOutValue = 0;
    for (const list of rows.values()) {
      for (const r of list) {
        if (!r.inPeriod) continue;
        const res = results.get(r.id);
        const isOut = res != null && directionOf(r.type, r.qty) === 'OUT';
        const next = isOut ? res : r.dirty ? { unitCost: r.unitCost ?? 0, totalCost: r.totalCost ?? 0 } : null;
        if (!next) continue;
        processed++;
        if (isOut) totalOutValue += next.totalCost;
        const s = stored.get(r.id)!;
        if (s.totalCost == null || s.unitCost == null || Number(s.totalCost) !== next.totalCost || Number(s.unitCost) !== next.unitCost) {
          updates.push({ id: r.id, ...next });
        }
      }
    }
    for (let i = 0; i < updates.length; i += 200) {
      await this.prisma.$transaction(
        updates
          .slice(i, i + 200)
          .map((u) => this.prisma.stockTransaction.update({ where: { id: u.id }, data: { unitCost: u.unitCost, totalCost: u.totalCost } })),
      );
    }
    return { month, method, ingredients: ids.length, processed, updated: updates.length, totalOutValue: round2(totalOutValue) };
  }
}
