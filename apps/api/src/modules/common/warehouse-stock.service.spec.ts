/* eslint-disable @typescript-eslint/require-await -- fake DB bất đồng bộ giả lập Prisma */
import { BadRequestException } from '@nestjs/common';
import { WarehouseStockService } from './warehouse-stock.service';

type Key = string;
const k = (i: string, w: string): Key => `${i}|${w}`;

/** Fake Prisma trong bộ nhớ: ingredient_stock + ingredient.currentStock + warehouse. */
function makeDb() {
  const stock = new Map<Key, number>();
  const totals = new Map<string, number>();
  const warehouses = [
    { id: 'W1', isDefault: true, active: true },
    { id: 'W2', isDefault: false, active: true },
    { id: 'W3', isDefault: false, active: false },
  ];
  const db = {
    warehouse: {
      findUnique: async ({ where }: any) => warehouses.find((w) => w.id === where.id) ?? null,
      findFirst: async () => warehouses.find((w) => w.isDefault) ?? null,
    },
    ingredientStock: {
      findUnique: async ({ where }: any) => {
        const { ingredientId, warehouseId } = where.ingredientId_warehouseId;
        const q = stock.get(k(ingredientId, warehouseId));
        return q === undefined ? null : { qty: q };
      },
      upsert: async ({ where, create, update }: any) => {
        const { ingredientId, warehouseId } = where.ingredientId_warehouseId;
        const key = k(ingredientId, warehouseId);
        if (stock.has(key)) stock.set(key, stock.get(key)! + update.qty.increment);
        else stock.set(key, Number(create.qty));
      },
    },
    ingredient: {
      update: async ({ where, data }: any) => void totals.set(where.id, (totals.get(where.id) ?? 0) + data.currentStock.increment),
    },
  };
  return { db: db as never, stock, totals, svc: new WarehouseStockService({} as never) };
}

describe('WarehouseStockService.resolveId', () => {
  it('không gửi warehouse_id ⇒ kho mặc định (tương thích client cũ)', async () => {
    const { db, svc } = makeDb();
    expect(await svc.resolveId(undefined, db)).toBe('W1');
    expect(await svc.resolveId(null, db)).toBe('W1');
  });
  it('kho chỉ định hợp lệ ⇒ dùng kho đó; không tồn tại / ngừng hoạt động ⇒ 400', async () => {
    const { db, svc } = makeDb();
    expect(await svc.resolveId('W2', db)).toBe('W2');
    await expect(svc.resolveId('nope', db)).rejects.toBeInstanceOf(BadRequestException);
    await expect(svc.resolveId('W3', db)).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('WarehouseStockService tồn theo kho ở 2 kho', () => {
  it('nhập / xuất / chế biến / kiểm kê / bỏ ghi: từng kho đúng, currentStock = tổng 2 kho', async () => {
    const { db, svc, stock, totals } = makeDb();
    const q = (i: string, w: string) => stock.get(k(i, w)) ?? 0;

    await svc.adjust(db, 'gao', 'W1', 100); // nhập kho 1
    await svc.adjust(db, 'gao', 'W2', 40); // nhập kho 2
    expect([q('gao', 'W1'), q('gao', 'W2'), totals.get('gao')]).toEqual([100, 40, 140]);

    await svc.adjust(db, 'gao', 'W1', -30); // xuất kho 1
    expect([q('gao', 'W1'), q('gao', 'W2'), totals.get('gao')]).toEqual([70, 40, 110]);

    // chế biến ở kho 2: nguồn -10, thành phẩm +8
    await svc.adjust(db, 'gao', 'W2', -10);
    await svc.adjust(db, 'com', 'W2', 8);
    expect([q('gao', 'W2'), q('com', 'W2'), q('com', 'W1'), totals.get('gao'), totals.get('com')]).toEqual([30, 8, 0, 100, 8]);

    // kiểm kê kho 1 về 65: chỉ kho 1 đổi
    await svc.setQty(db, 'gao', 'W1', 65);
    expect([q('gao', 'W1'), q('gao', 'W2'), totals.get('gao')]).toEqual([65, 30, 95]);

    // bỏ ghi phiếu nhập 40 của kho 2 (đảo bút toán đúng kho)
    await svc.adjust(db, 'gao', 'W2', -40 + 10);
    expect([q('gao', 'W1'), q('gao', 'W2'), totals.get('gao')]).toEqual([65, 0, 65]);
  });

  it('getQty: chưa có dòng tồn ⇒ 0; tồn kho này không lẫn kho khác', async () => {
    const { db, svc } = makeDb();
    await svc.adjust(db, 'x', 'W1', 5);
    expect(await svc.getQty(db, 'x', 'W1')).toBe(5);
    expect(await svc.getQty(db, 'x', 'W2')).toBe(0);
  });
});
