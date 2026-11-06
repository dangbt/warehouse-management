/* eslint-disable @typescript-eslint/require-await -- fake DB bất đồng bộ giả lập Prisma */
import { BadRequestException } from '@nestjs/common';
import { StockExportCancelService } from './stock-export-cancel.service';
import { PeriodLockedException } from '../common/period-lock';

function setup(lockedUntil: Date | null = null) {
  const db = { stock: 60, batch: 10, status: 'POSTED', txQty: -40, txNote: 'Hao hụt' as string | null };
  const voucher = () => ({
    id: 'e1',
    status: db.status,
    voucherDate: new Date('2026-11-01T00:00:00Z'),
    transactions: [{ id: 't1', ingredientId: 'ing', quantity: db.txQty, referenceId: 'b1', note: db.txNote }],
  });
  const tx = {
    stockExport: {
      findUnique: async () => voucher(),
      update: async ({ data }: { data: { status: string } }) => void (db.status = data.status),
    },
    ingredient: { update: async ({ data }: any) => void (db.stock += data.currentStock.increment) },
    ingredientBatch: { updateMany: async ({ data }: any) => void (db.batch += data.quantity.increment) },
    stockTransaction: {
      update: async ({ data }: any) => {
        db.txQty = data.quantity;
        db.txNote = data.note;
      },
      deleteMany: jest.fn(),
    },
  };
  const prisma: any = { $transaction: async (fn: any) => fn(tx) };
  const lock: any = {
    assertOpen: async (d: Date) => {
      if (lockedUntil && d <= lockedUntil) throw new PeriodLockedException(lockedUntil);
    },
  };
  return { db, tx, svc: new StockExportCancelService(prisma, lock) };
}

describe('StockExportCancelService', () => {
  it('cộng lại tồn + lô, status CANCELLED, giữ dòng giao dịch (không xoá)', async () => {
    const { db, tx, svc } = setup();
    const r = await svc.cancel('e1');
    expect(r.status).toBe('CANCELLED');
    expect(db.stock).toBe(100);
    expect(db.batch).toBe(50);
    expect(db.status).toBe('CANCELLED');
    expect(db.txQty).toBe(0);
    expect(db.txNote).toContain('SL gốc 40');
    expect(tx.stockTransaction.deleteMany).not.toHaveBeenCalled();
  });

  it('chặn khi kỳ đã khoá và không đổi tồn', async () => {
    const { db, svc } = setup(new Date('2026-11-30T00:00:00Z'));
    await expect(svc.cancel('e1')).rejects.toBeInstanceOf(PeriodLockedException);
    expect(db.stock).toBe(60);
    expect(db.status).toBe('POSTED');
  });

  it('chặn huỷ lần 2', async () => {
    const { db, svc } = setup();
    await svc.cancel('e1');
    await expect(svc.cancel('e1')).rejects.toBeInstanceOf(BadRequestException);
    expect(db.stock).toBe(100);
  });
});
