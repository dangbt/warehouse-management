import { parseBound } from '../reports/report-range';

/**
 * Điều kiện lọc `voucherDate` từ query `from`/`to` (YYYY-MM-DD theo ngày lịch VN, hoặc ISO UTC).
 * Trả undefined khi không truyền biên nào; chấp nhận chỉ một biên.
 */
export function voucherDateFilter(q: { from?: string; to?: string }): { gte?: Date; lte?: Date } | undefined {
  const range: { gte?: Date; lte?: Date } = {};
  if (q.from) {
    const d = parseBound(q.from, false);
    if (!isNaN(d.getTime())) range.gte = d;
  }
  if (q.to) {
    const d = parseBound(q.to, true);
    if (!isNaN(d.getTime())) range.lte = d;
  }
  return range.gte || range.lte ? range : undefined;
}

/** Decimal/null → number (dùng cho meta.totals). */
export function toNum(v: unknown): number {
  return v == null ? 0 : Number(v);
}
