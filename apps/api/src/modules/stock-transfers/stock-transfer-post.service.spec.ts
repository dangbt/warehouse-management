/* eslint-disable @typescript-eslint/require-await -- fake DB bất đồng bộ giả lập Prisma */
import { BadRequestException, ConflictException } from '@nestjs/common';
import { StockTransferPostService, sumByIngredient } from './stock-transfer-post.service';
import { BatchDeductionService } from '../common/batch-deduction.service';
import { WarehouseStockService } from '../common/warehouse-stock.service';
import { PeriodLockedException } from '../common/period-lock';

const EXPIRY = new Date('2027-01-31T00:00:00Z');
const RECEIVED = new Date('2026-10-01T00:00:00Z');

interface Batch {
  id: string;
  ingredientId: string;
  warehouseId: string;
  batchCode: string;
  quantity: number;
  costPerUnit: number;
  expiryDate: Date | null;
  receivedDate: Date;
  status: string;
  transferId?: string;
}

function setup(opts: { srcQty?: number; lockedUntil?: Date | null } = {}) {
  const db = {
    status: 'PENDING',
    stock: { 'ing|A': opts.srcQty ?? 10, 'ing|B': 0 } as Record<string, number>,
    batches: [
      {
        id: 'b1',
        ingredientId: 'ing',
        warehouseId: 'A',
        batchCode: 'L1',
        quantity: opts.srcQty ?? 10,
        costPerUnit: 12000,
        expiryDate: EXPIRY,
        receivedDate: RECEIVED,
        status: 'ACTIVE',
      },
    ] as Batch[],
    txs: [] as any[],
    seq: 0,
  };
  const transfer = () => ({
    id: 't1',
    voucherNo: 'CK00001',
    voucherDate: new Date('2026-11-05T00:00:00Z'),
    status: db.status,
    fromWarehouseId: 'A',
    toWarehouseId: 'B',
    items: [{ ingredientId: 'ing', quantity: 6, ingredient: { name: 'Bột' } }],
    transactions: db.txs,
  });
  const tx: any = {
    stockTransfer: {
      findUnique: async () => transfer(),
      update: async ({ data }: any) => void (db.status = data.status),
    },
    warehouse: { findUnique: async ({ where }: any) => ({ id: where.id, active: true }) },
    ingredientStock: {
      findUnique: async ({ where }: any) => ({
        qty: db.stock[`${where.ingredientId_warehouseId.ingredientId}|${where.ingredientId_warehouseId.warehouseId}`] ?? 0,
      }),
      upsert: async ({ where, update }: any) => {
        const k = `${where.ingredientId_warehouseId.ingredientId}|${where.ingredientId_warehouseId.warehouseId}`;
        db.stock[k] = (db.stock[k] ?? 0) + update.qty.increment;
      },
    },
    ingredient: { update: async () => undefined },
    ingredientBatch: {
      findMany: async ({ where }: any) =>
        db.batches.filter((b) => {
          if (where.transferId) return b.transferId === where.transferId;
          if (where.id?.in) return where.id.in.includes(b.id);
          return b.ingredientId === where.ingredientId && b.warehouseId === where.warehouseId && b.status === 'ACTIVE' && b.quantity > 0;
        }),
      update: async ({ where, data }: any) => {
        const b = db.batches.find((x) => x.id === where.id)!;
        b.quantity -= data.quantity.decrement;
        b.status = data.status;
      },
      updateMany: async ({ where, data }: any) => {
        const b = db.batches.find((x) => x.id === where.id)!;
        b.quantity += data.quantity.increment;
        b.status = data.status;
      },
      create: async ({ data }: any) => {
        const b = { id: `nb${++db.seq}`, status: 'ACTIVE', ...data, quantity: data.quantity, costPerUnit: Number(data.costPerUnit) };
        db.batches.push(b);
        return b;
      },
      deleteMany: async ({ where }: any) => void (db.batches = db.batches.filter((b) => b.transferId !== where.transferId)),
    },
    stockTransaction: {
      create: async ({ data }: any) => void db.txs.push({ ...data }),
      deleteMany: async () => void (db.txs.length = 0),
    },
  };
  const prisma: any = { $transaction: async (fn: any) => fn(tx) };
  const lock: any = {
    assertOpen: async (d: Date) => {
      if (opts.lockedUntil && d <= opts.lockedUntil) throw new PeriodLockedException(opts.lockedUntil);
    },
  };
  const stock = new WarehouseStockService(prisma);
  const svc = new StockTransferPostService(prisma, lock, new BatchDeductionService(), stock);
  return { svc, db };
}

describe('sumByIngredient', () => {
  it('gộp SL các dòng cùng nguyên liệu', () => {
    const m = sumByIngredient([
      { ingredientId: 'a', quantity: 1.5 },
      { ingredientId: 'a', quantity: '2' },
      { ingredientId: 'b', quantity: 3 },
    ]);
    expect(m.get('a')).toBe(3.5);
    expect(m.get('b')).toBe(3);
  });
});

describe('StockTransferPostService', () => {
  it('duyệt: trừ kho nguồn, tạo lô kho đích giữ HSD + giá vốn, sinh TRANSFER_OUT/IN', async () => {
    const { svc, db } = setup();
    await svc.approve('t1', 'u1');
    expect(db.status).toBe('COMPLETED');
    expect(db.stock['ing|A']).toBe(4);
    expect(db.stock['ing|B']).toBe(6);
    const src = db.batches.find((b) => b.id === 'b1')!;
    expect(src.quantity).toBe(4);
    const dest = db.batches.find((b) => b.warehouseId === 'B')!;
    expect(dest).toMatchObject({
      quantity: 6,
      costPerUnit: 12000,
      expiryDate: EXPIRY,
      receivedDate: RECEIVED,
      batchCode: 'L1',
      transferId: 't1',
    });
    const out = db.txs.find((t) => t.type === 'TRANSFER_OUT');
    const inn = db.txs.find((t) => t.type === 'TRANSFER_IN');
    expect(out).toMatchObject({ warehouseId: 'A', quantity: -6, unitCost: 12000, totalCost: 72000 });
    expect(inn).toMatchObject({ warehouseId: 'B', quantity: 6, unitCost: 12000, totalCost: 72000 });
  });

  it('chặn chuyển vượt tồn kho nguồn, không ghi gì', async () => {
    const { svc, db } = setup({ srcQty: 5 });
    await expect(svc.approve('t1', 'u1')).rejects.toBeInstanceOf(BadRequestException);
    expect(db.status).toBe('PENDING');
    expect(db.txs).toHaveLength(0);
    expect(db.batches).toHaveLength(1);
  });

  it('tuân khoá sổ: duyệt và bỏ ghi trong kỳ đã khoá bị chặn', async () => {
    const locked = setup({ lockedUntil: new Date('2026-11-30T00:00:00Z') });
    await expect(locked.svc.approve('t1', 'u1')).rejects.toBeInstanceOf(PeriodLockedException);
    expect(locked.db.txs).toHaveLength(0);
  });

  it('bỏ ghi: trả lô + tồn nguồn, xoá lô đích và 2 bút toán, về PENDING', async () => {
    const { svc, db } = setup();
    await svc.approve('t1', 'u1');
    await svc.unpost('t1');
    expect(db.status).toBe('PENDING');
    expect(db.stock['ing|A']).toBe(10);
    expect(db.stock['ing|B']).toBe(0);
    expect(db.batches).toHaveLength(1);
    expect(db.batches[0]).toMatchObject({ id: 'b1', quantity: 10, status: 'ACTIVE' });
    expect(db.txs).toHaveLength(0);
    // duyệt lại không tính đôi
    await svc.approve('t1', 'u1');
    expect(db.stock['ing|A']).toBe(4);
    expect(db.stock['ing|B']).toBe(6);
  });

  it('bỏ ghi bị chặn khi lô ở kho đích đã được dùng một phần', async () => {
    const { svc, db } = setup();
    await svc.approve('t1', 'u1');
    db.batches.find((b) => b.warehouseId === 'B')!.quantity = 2;
    await expect(svc.unpost('t1')).rejects.toBeInstanceOf(ConflictException);
    expect(db.status).toBe('COMPLETED');
  });

  it('bỏ ghi phiếu chưa duyệt bị từ chối', async () => {
    const { svc } = setup();
    await expect(svc.unpost('t1')).rejects.toBeInstanceOf(BadRequestException);
  });
});
