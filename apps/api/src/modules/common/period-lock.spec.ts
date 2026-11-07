import { assertDateOpen, isDateLocked, PeriodLockedException, PERIOD_LOCKED, vnCalendarDay } from './period-lock';
import { monthsBetween, parseLockDate } from '../inventory-period/inventory-period.service';

// Ngày khoá 30/09/2026 (cột @db.Date ⇒ 00:00 UTC)
const LOCK = new Date('2026-09-30T00:00:00.000Z');

describe('isDateLocked (biên ngày, lịch VN)', () => {
  it('chưa khoá (null) ⇒ không chặn', () => {
    expect(isDateLocked(new Date('2020-01-01T00:00:00Z'), null)).toBe(false);
  });
  it('đúng ngày khoá ⇒ bị chặn (đầu ngày và cuối ngày VN)', () => {
    expect(isDateLocked(new Date('2026-09-29T17:00:00.000Z'), LOCK)).toBe(true); // 00:00 30/09 VN
    expect(isDateLocked(new Date('2026-09-30T16:59:59.999Z'), LOCK)).toBe(true); // 23:59:59.999 30/09 VN
  });
  it('sau ngày khoá 1 ngày ⇒ được phép', () => {
    expect(isDateLocked(new Date('2026-09-30T17:00:00.000Z'), LOCK)).toBe(false); // 00:00 01/10 VN
    expect(isDateLocked(new Date('2026-10-01T00:00:00.000Z'), LOCK)).toBe(false);
  });
  it('trước ngày khoá ⇒ bị chặn', () => {
    expect(isDateLocked(new Date('2026-08-15T05:00:00.000Z'), LOCK)).toBe(true);
  });
  it('timestamp UTC 30/09 20:00 = 01/10 VN ⇒ không bị chặn dù ngày UTC là 30/09', () => {
    expect(isDateLocked(new Date('2026-09-30T20:00:00.000Z'), LOCK)).toBe(false);
  });
  it('timestamp UTC 30/09 00:00 = 07:00 30/09 VN ⇒ bị chặn', () => {
    expect(isDateLocked(new Date('2026-09-30T00:00:00.000Z'), LOCK)).toBe(true);
  });
});

describe('assertDateOpen', () => {
  it('ném 409 PERIOD_LOCKED kèm code, không hardcode câu tiếng Việt', () => {
    try {
      assertDateOpen(new Date('2026-09-30T00:00:00.000Z'), LOCK);
      throw new Error('phải ném lỗi');
    } catch (e) {
      expect(e).toBeInstanceOf(PeriodLockedException);
      const ex = e as PeriodLockedException;
      expect(ex.getStatus()).toBe(409);
      expect(ex.getResponse()).toMatchObject({ statusCode: 409, code: PERIOD_LOCKED, message: PERIOD_LOCKED, lockedUntil: '2026-09-30' });
    }
  });
  it('không ném khi ngày mở', () => {
    expect(() => assertDateOpen(new Date('2026-10-01T00:00:00.000Z'), LOCK)).not.toThrow();
    expect(() => assertDateOpen(new Date('2026-01-01T00:00:00.000Z'), null)).not.toThrow();
  });
});

describe('vnCalendarDay', () => {
  it('quy về 00:00 UTC của ngày lịch VN', () => {
    expect(new Date(vnCalendarDay(new Date('2026-09-30T20:00:00.000Z'))).toISOString()).toBe('2026-10-01T00:00:00.000Z');
  });
});

describe('parseLockDate / monthsBetween', () => {
  it('parse hợp lệ và từ chối ngày sai', () => {
    expect(parseLockDate('2026-09-30').toISOString()).toBe('2026-09-30T00:00:00.000Z');
    expect(() => parseLockDate('2026-02-30')).toThrow();
    expect(() => parseLockDate('30/09/2026')).toThrow();
    expect(() => parseLockDate(undefined)).toThrow();
  });
  it('liệt kê tháng qua ranh giới năm', () => {
    expect(monthsBetween(new Date('2026-11-15T00:00:00Z'), new Date('2027-01-02T00:00:00Z'))).toEqual(['2026-11', '2026-12', '2027-01']);
  });
});
