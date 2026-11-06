const VN_OFFSET_MS = 7 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Ngày lịch hiện tại theo giờ VN, trả về 00:00 VN quy ra UTC. */
export function vnStartOfDay(now: Date): Date {
  const vn = new Date(now.getTime() + VN_OFFSET_MS);
  return new Date(Date.UTC(vn.getUTCFullYear(), vn.getUTCMonth(), vn.getUTCDate()) - VN_OFFSET_MS);
}

function parseBound(v: string, endOfDay: boolean): Date {
  // Chuỗi chỉ-ngày (YYYY-MM-DD) hiểu là ngày lịch VN; ISO đầy đủ là biên UTC do client gửi.
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) {
    const start = new Date(`${v}T00:00:00.000Z`).getTime() - VN_OFFSET_MS;
    return new Date(endOfDay ? start + DAY_MS - 1 : start);
  }
  return new Date(v);
}

/**
 * Khoảng thời gian (UTC) của báo cáo lọc theo ngày chứng từ.
 * Có from+to: dùng biên client gửi. Nếu không: theo `period` (month/week) tính theo lịch VN.
 */
export function resolveReportRange(q: { period?: string; from?: string; to?: string }, now: Date = new Date()): { from: Date; to: Date } {
  if (q.from && q.to) return { from: parseBound(q.from, false), to: parseBound(q.to, true) };
  const today = vnStartOfDay(now);
  const to = new Date(today.getTime() + DAY_MS - 1);
  const vnToday = new Date(today.getTime() + VN_OFFSET_MS);
  if (q.period === 'month') {
    const from = new Date(Date.UTC(vnToday.getUTCFullYear(), vnToday.getUTCMonth(), 1) - VN_OFFSET_MS);
    return { from, to };
  }
  const day = vnToday.getUTCDay() || 7;
  return { from: new Date(today.getTime() - (day - 1) * DAY_MS), to };
}
