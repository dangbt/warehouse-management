import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { assertDateOpen } from './period-lock';

type Db = Pick<Prisma.TransactionClient, 'inventorySetting'>;

/** Guard khoá sổ kho dùng chung cho mọi service chứng từ. */
@Injectable()
export class PeriodLockService {
  constructor(private prisma: PrismaService) {}

  async getLockedUntil(db: Db = this.prisma): Promise<Date | null> {
    const s = await db.inventorySetting.findUnique({ where: { id: 'default' }, select: { lockedUntil: true } });
    return s?.lockedUntil ?? null;
  }

  /** Chặn (409 PERIOD_LOCKED) nếu ngày chứng từ nằm trong kỳ đã khoá. */
  async assertOpen(voucherDate: Date, db: Db = this.prisma): Promise<void> {
    assertDateOpen(voucherDate, await this.getLockedUntil(db));
  }
}
