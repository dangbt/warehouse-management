import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PeriodLockService } from '../common/period-lock.service';
import { vnCalendarDay } from '../common/period-lock';
import { CostingPeriodService } from '../costing/costing-period.service';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Parse 'YYYY-MM-DD' thành 00:00 UTC của ngày lịch; sai định dạng/ngày không tồn tại ⇒ 400. */
export function parseLockDate(input: string | null | undefined): Date {
  if (!input || !DATE_RE.test(input)) throw new BadRequestException('INVALID_LOCK_DATE');
  const d = new Date(`${input}T00:00:00.000Z`);
  if (isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== input) throw new BadRequestException('INVALID_LOCK_DATE');
  return d;
}

const iso = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : null);

/** Danh sách tháng 'YYYY-MM' từ tháng của `from` tới tháng của `to` (đều là ngày lịch UTC-midnight). */
export function monthsBetween(from: Date, to: Date): string[] {
  const out: string[] = [];
  let y = from.getUTCFullYear();
  let m = from.getUTCMonth();
  const endY = to.getUTCFullYear();
  const endM = to.getUTCMonth();
  while (y < endY || (y === endY && m <= endM)) {
    out.push(`${y}-${String(m + 1).padStart(2, '0')}`);
    if (++m > 11) {
      m = 0;
      y++;
    }
  }
  return out;
}

/** Khoá sổ / mở khoá sổ kho. Audit log ghi tự động bởi AuditInterceptor (kèm `previousLockedUntil` trong response). */
@Injectable()
export class InventoryPeriodService {
  constructor(
    private prisma: PrismaService,
    private periodLock: PeriodLockService,
    private costing: CostingPeriodService,
  ) {}

  async getStatus() {
    return { lockedUntil: iso(await this.periodLock.getLockedUntil()) };
  }

  /** Khoá sổ đến ngày `date`: tự tính giá xuất kho các tháng chưa khoá rồi mới ghi ngày khoá. */
  async lock(date: string) {
    const target = parseLockDate(date);
    if (target.getTime() > vnCalendarDay(new Date())) throw new BadRequestException('LOCK_DATE_IN_FUTURE');
    const current = await this.periodLock.getLockedUntil();
    if (current && target.getTime() <= current.getTime()) throw new BadRequestException('LOCK_DATE_NOT_AFTER_CURRENT');

    const earliest = current
      ? new Date(current.getTime() + 86400000)
      : await this.prisma.stockTransaction
          .findFirst({ orderBy: { voucherDate: 'asc' }, select: { voucherDate: true } })
          .then((t) => (t ? new Date(vnCalendarDay(t.voucherDate)) : target));
    const costed: string[] = [];
    for (const month of monthsBetween(earliest, target)) {
      await this.costing.run(month);
      costed.push(month);
    }
    await this.save(target);
    return { lockedUntil: iso(target), previousLockedUntil: iso(current), costedMonths: costed };
  }

  /** Mở khoá: về ngày sớm hơn `date`, hoặc bỏ hẳn khoá khi không truyền. */
  async reopen(date?: string | null) {
    const current = await this.periodLock.getLockedUntil();
    if (!current) throw new BadRequestException('NOT_LOCKED');
    let next: Date | null = null;
    if (date) {
      next = parseLockDate(date);
      if (next.getTime() >= current.getTime()) throw new BadRequestException('REOPEN_DATE_NOT_BEFORE_CURRENT');
    }
    await this.save(next);
    return { lockedUntil: iso(next), previousLockedUntil: iso(current) };
  }

  private save(lockedUntil: Date | null) {
    return this.prisma.inventorySetting.upsert({
      where: { id: 'default' },
      update: { lockedUntil },
      create: { id: 'default', lockedUntil },
    });
  }
}
