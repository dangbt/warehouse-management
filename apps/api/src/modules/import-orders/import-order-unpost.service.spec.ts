/* eslint-disable @typescript-eslint/require-await -- fake DB bất đồng bộ giả lập Prisma, không cần await thật */
import { ConflictException } from '@nestjs/common';
import {
  ImportOrderUnpostService,
  findUnpostShortages,
  IMPORT_UNPOST_HAS_RETURN,
  IMPORT_UNPOST_NEGATIVE_STOCK,
} from './import-order-unpost.service';
import { PeriodLockedException } from '../common/period-lock';

describe('findUnpostShortages', () => {
  it('lô còn nguyên ⇒ không thiếu', () => {
    const r = findUnpostShortages([{ ingredientId: 'a', ingredientName: 'A', quantity: 10, batchRemaining: 10 }], new Map([['a', 10]]));
    expect(r).toEqual([]);
  });

  it('lô đã xuất một phần ⇒ báo thiếu đúng NL', () => {
    const r = findUnpostShortages([{ ingredientId: 'a', ingredientName: 'Gạo', quantity: 10, batchRemaining: 4 }], new Map([['a', 4]]));
    expect(r).toEqual([{ ingredientId: 'a', ingredientName: 'Gạo', imported: 10, remaining: 4, shortage: 6 }]);
  });
});

/** Fake DB tối thiểu trong bộ nhớ: đủ để kiểm tra tồn/lô/công nợ/giao dịch kho sau khi bỏ ghi. */
function makeDb(over: { returns?: { voucherNo: string }[]; batchQty?: number; lockedUntil?: Date | null } = {}) {
  const db = {
    stock: 100,
    debt: 500,
    batches: 1,
    txs: 1,
    status: 'COMPLETED',
    approvedById: 'u1' as string | null,
  };
  const order = {
    id: 'o1',
    status: 'COMPLETED',
    voucherDate: new Date('2026-11-01T00:00:00Z'),
    warehouseId: 'wh-main',
    supplierId: 's1',
    totalAmount: 500,
    paid: false,
    items: [
      {
        id: 'i1',
        ingredientId: 'ing',
        quantity: 100,
        batch: { quantity: over.batchQty ?? 100 },
        ingredient: { name: 'Gạo', currentStock: 100 },
      },
    ],
  };
  const tx = {
    importOrder: {
      findUnique: async () => order,
      update: async ({ data }: { data: { status: string; approvedById: null } }) => {
        db.status = data.status;
        db.approvedById = data.approvedById;
      },
    },
    purchaseReturn: { findMany: async () => over.returns ?? [] },
    inventorySetting: { findUnique: async () => ({ lockedUntil: over.lockedUntil ?? null }) },
    warehouse: {
      findFirst: async () => ({ id: 'wh-main' }),
      findUnique: async ({ where }: { where: { id: string } }) => ({ id: where.id, active: true }),
    },
    ingredientStock: { findUnique: async () => ({ qty: db.stock }), upsert: async () => undefined },
    ingredient: {
      update: async ({ data }: { data: { currentStock: { decrement?: number; increment?: number } } }) =>
        void (db.stock += data.currentStock.increment ?? -(data.currentStock.decrement ?? 0)),
    },
    ingredientBatch: { deleteMany: async () => void (db.batches = 0) },
    stockTransaction: { deleteMany: async () => void (db.txs = 0) },
    supplier: { update: async ({ data }: { data: { totalDebt: { decrement: number } } }) => void (db.debt -= data.totalDebt.decrement) },
  };
  const prisma = { $transaction: async (fn: (t: typeof tx) => unknown) => fn(tx) };
  const lock = {
    assertOpen: async (d: Date) => {
      const lu = over.lockedUntil;
      if (lu && d.getTime() <= lu.getTime()) throw new PeriodLockedException(lu);
    },
  };
  return { db, svc: new ImportOrderUnpostService(prisma as never, lock as never) };
}

describe('ImportOrderUnpostService.unpost', () => {
  it('đảo tồn, lô, giao dịch kho, công nợ về đúng trước khi duyệt và trả phiếu về PENDING', async () => {
    const { db, svc } = makeDb();
    const r = await svc.unpost('o1');
    expect(r.status).toBe('PENDING');
    expect(db).toMatchObject({ stock: 0, debt: 0, batches: 0, txs: 0, status: 'PENDING', approvedById: null });
  });

  it('chặn khi lô đã bị xuất một phần (tồn âm), kèm NL thiếu', async () => {
    const { db, svc } = makeDb({ batchQty: 60 });
    const err = await svc.unpost('o1').catch((e) => e);
    expect(err).toBeInstanceOf(ConflictException);
    expect(err.getResponse()).toMatchObject({ code: IMPORT_UNPOST_NEGATIVE_STOCK, shortages: [{ ingredientName: 'Gạo', shortage: 40 }] });
    expect(db.stock).toBe(100);
  });

  it('chặn khi có phiếu trả hàng liên kết', async () => {
    const { svc } = makeDb({ returns: [{ voucherNo: 'TH00001' }] });
    const err = await svc.unpost('o1').catch((e) => e);
    expect(err.getResponse()).toMatchObject({ code: IMPORT_UNPOST_HAS_RETURN, returns: ['TH00001'] });
  });

  it('chặn khi kỳ đã khoá sổ', async () => {
    const { svc } = makeDb({ lockedUntil: new Date('2026-11-30T00:00:00Z') });
    await expect(svc.unpost('o1')).rejects.toBeInstanceOf(PeriodLockedException);
  });
});
