/* eslint-disable @typescript-eslint/require-await -- fake DB bất đồng bộ giả lập Prisma, không cần await thật */
import { ImportOrderUnpostService } from './import-order-unpost.service';
import { applyReceiptToPo } from '../purchasing/purchase-receipt';

/** Fake DB: 1 PO (1 dòng NL "ing") + các phiếu nhập; dùng applyReceiptToPo/revertReceiptFromPo thật. */
function makeDb(opts: { ordered: number; poStatus?: string; withPo?: boolean }) {
  const po = { id: 'po1', status: opts.poStatus ?? 'UNRECEIVED' };
  const line = { id: 'l1', ingredientId: 'ing', quantity: opts.ordered, receivedQty: 0 };
  const orders = new Map<string, { id: string; status: string; qty: number }>();
  const tx = {
    purchaseOrder: {
      findUnique: async () => ({ ...po, items: [{ ...line }] }),
      update: async ({ data }: { data: { status: string } }) => void (po.status = data.status),
    },
    purchaseOrderItem: { update: async ({ data }: { data: { receivedQty: number } }) => void (line.receivedQty = data.receivedQty) },
    importOrder: {
      findUnique: async ({ where }: { where: { id: string } }) => {
        const o = orders.get(where.id)!;
        return {
          id: o.id,
          status: o.status,
          voucherDate: new Date('2026-11-01T00:00:00Z'),
          warehouseId: 'wh-main',
          supplierId: 's1',
          totalAmount: 0,
          paid: true,
          purchaseOrderId: opts.withPo === false ? null : 'po1',
          items: [
            {
              id: `i-${o.id}`,
              ingredientId: 'ing',
              quantity: o.qty,
              batch: { quantity: o.qty },
              ingredient: { name: 'Gạo', currentStock: 1000 },
            },
          ],
        };
      },
      update: async ({ where, data }: { where: { id: string }; data: { status: string } }) =>
        void (orders.get(where.id)!.status = data.status),
    },
    purchaseReturn: { findMany: async () => [] },
    warehouse: {
      findFirst: async () => ({ id: 'wh-main' }),
      findUnique: async ({ where }: { where: { id: string } }) => ({ id: where.id, active: true }),
    },
    ingredientStock: { findUnique: async () => ({ qty: 1000 }), upsert: async () => undefined },
    ingredient: { update: async () => undefined },
    ingredientBatch: { deleteMany: async () => undefined },
    stockTransaction: { deleteMany: async () => undefined },
    supplier: { update: async () => undefined },
  };
  const prisma = { $transaction: async (fn: (t: typeof tx) => unknown) => fn(tx) };
  const lock = { assertOpen: async () => undefined };
  const svc = new ImportOrderUnpostService(prisma as never, lock as never);
  /** Giả lập duyệt phiếu: đúng như ImportOrdersService.approve gọi applyReceiptToPo. */
  const approve = async (id: string, qty: number) => {
    orders.set(id, { id, status: 'COMPLETED', qty });
    if (opts.withPo !== false) await applyReceiptToPo(tx as never, 'po1', [{ ingredientId: 'ing', quantity: qty }]);
  };
  return { po, line, svc, approve };
}

describe('unpost phiếu nhập liên kết PO', () => {
  it('đặt 0.8, nhận 0.7 rồi 0.1 ⇒ RECEIVED; unpost phiếu 0.1 ⇒ receivedQty 0.7 và PARTIAL', async () => {
    const { po, line, svc, approve } = makeDb({ ordered: 0.8 });
    await approve('a', 0.7);
    await approve('b', 0.1);
    expect(po.status).toBe('RECEIVED');
    await svc.unpost('b');
    expect(line.receivedQty).toBe(0.7);
    expect(po.status).toBe('PARTIAL');
  });

  it('unpost phiếu duy nhất ⇒ UNRECEIVED, SL còn lại đủ như ban đầu', async () => {
    const { po, line, svc, approve } = makeDb({ ordered: 10 });
    await approve('a', 4);
    expect(po.status).toBe('PARTIAL');
    await svc.unpost('a');
    expect(line.receivedQty).toBe(0);
    expect(po.status).toBe('UNRECEIVED');
    expect(line.quantity - line.receivedQty).toBe(10);
  });

  it('duyệt lại sau khi unpost không tính đôi', async () => {
    const { po, line, svc, approve } = makeDb({ ordered: 10 });
    await approve('a', 10);
    expect(po.status).toBe('RECEIVED');
    await svc.unpost('a');
    await approve('a', 6); // sửa phiếu còn 6 rồi duyệt lại
    expect(line.receivedQty).toBe(6);
    expect(po.status).toBe('PARTIAL');
  });

  it('phiếu không có purchaseOrderId ⇒ không đụng PO', async () => {
    const { po, line, svc, approve } = makeDb({ ordered: 10, withPo: false });
    line.receivedQty = 3;
    po.status = 'PARTIAL';
    await approve('a', 5);
    await svc.unpost('a');
    expect(line.receivedQty).toBe(3);
    expect(po.status).toBe('PARTIAL');
  });

  it('PO đã huỷ ⇒ trừ SL nhưng không đổi status', async () => {
    const { po, line, svc, approve } = makeDb({ ordered: 10 });
    await approve('a', 4);
    po.status = 'CANCELLED';
    await svc.unpost('a');
    expect(line.receivedQty).toBe(0);
    expect(po.status).toBe('CANCELLED');
  });
});
