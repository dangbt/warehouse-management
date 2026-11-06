/** Biên UTC của khoảng ngày lịch (YYYY-MM-DD) theo giờ Việt Nam (UTC+7): 00:00:00.000 → 23:59:59.999. */
export function vnDayBoundsUtc(from: string, to: string): { from: string; to: string } {
  return {
    from: new Date(`${from}T00:00:00.000+07:00`).toISOString(),
    to: new Date(`${to}T23:59:59.999+07:00`).toISOString(),
  }
}
