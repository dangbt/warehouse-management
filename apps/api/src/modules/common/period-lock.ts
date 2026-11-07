import { ConflictException } from '@nestjs/common';

export const PERIOD_LOCKED = 'PERIOD_LOCKED';

/** Lệch giờ Việt Nam so với UTC (UTC+7, không DST). */
const VN_OFFSET_MS = 7 * 60 * 60 * 1000;

/** Ngày lịch VN của một thời điểm, quy về 00:00 UTC của ngày đó (cùng dạng với cột `@db.Date`). */
export function vnCalendarDay(d: Date): number {
  const t = d.getTime() + VN_OFFSET_MS;
  return t - (((t % 86400000) + 86400000) % 86400000);
}

/** Chứng từ có ngày CT (theo lịch VN) <= ngày khoá ⇒ đã khoá. `lockedUntil` null ⇒ chưa khoá. */
export function isDateLocked(voucherDate: Date, lockedUntil: Date | null | undefined): boolean {
  if (!lockedUntil) return false;
  return vnCalendarDay(voucherDate) <= lockedUntil.getTime();
}

/** Lỗi 409 kèm error code ổn định; web dịch thông báo từ `code`, API không gắn câu tiếng Việt. */
export class PeriodLockedException extends ConflictException {
  constructor(lockedUntil: Date) {
    super({ statusCode: 409, code: PERIOD_LOCKED, message: PERIOD_LOCKED, lockedUntil: lockedUntil.toISOString().slice(0, 10) });
  }
}

/** Ném PeriodLockedException nếu ngày chứng từ rơi vào kỳ đã khoá. */
export function assertDateOpen(voucherDate: Date, lockedUntil: Date | null | undefined): void {
  if (lockedUntil && isDateLocked(voucherDate, lockedUntil)) throw new PeriodLockedException(lockedUntil);
}
