import { buildMaterialsBookEntry, normalizeMovement, roundQty } from './materials-book';
import type { StockMovement } from './materials-book';

const ing = { id: 'i1', name: 'Bột mì', unit: 'kg' };

describe('buildMaterialsBookEntry', () => {
  it('tồn đầu + nhập − xuất = tồn cuối (SL và giá trị)', () => {
    const movements: StockMovement[] = [
      {
        date: '2026-09-02T00:00:00.000Z',
        direction: 'IN',
        type: 'IMPORT',
        document: 'PN001',
        description: 'Nhập kho: PN001',
        quantity: 100,
        value: 2_000_000,
      },
      {
        date: '2026-09-10T00:00:00.000Z',
        direction: 'OUT',
        type: 'EXPORT',
        document: 'Xuất bếp',
        description: 'Xuất bếp',
        quantity: 40,
        value: 800_000,
      },
      {
        date: '2026-09-20T00:00:00.000Z',
        direction: 'IN',
        type: 'IMPORT',
        document: 'PN002',
        description: 'Nhập kho: PN002',
        quantity: 50,
        value: 1_000_000,
      },
    ];
    const entry = buildMaterialsBookEntry(ing, 20, 400_000, movements);

    expect(entry.opening).toEqual({ quantity: 20, value: 400_000 });
    expect(entry.totalIn).toEqual({ quantity: 150, value: 3_000_000 });
    expect(entry.totalOut).toEqual({ quantity: 40, value: 800_000 });
    // 20 + 150 − 40 = 130
    expect(entry.closing.quantity).toBe(130);
    // 400k + 3tr − 800k = 2.6tr
    expect(entry.closing.value).toBe(2_600_000);
    // Bất biến số lượng phải luôn đúng.
    expect(entry.closing.quantity).toBe(entry.opening.quantity + entry.totalIn.quantity - entry.totalOut.quantity);
  });

  it('không có phát sinh ⇒ tồn cuối = tồn đầu', () => {
    const entry = buildMaterialsBookEntry(ing, 12.5, 250_000, []);
    expect(entry.rows).toHaveLength(0);
    expect(entry.closing).toEqual(entry.opening);
  });

  it('giữ đúng bất biến số lượng với số lẻ 3 chữ số thập phân', () => {
    const movements: StockMovement[] = [
      { date: '2026-09-01T00:00:00.000Z', direction: 'IN', type: 'IMPORT', document: 'PN', description: '', quantity: 10.125, value: 100 },
      { date: '2026-09-05T00:00:00.000Z', direction: 'OUT', type: 'EXPORT', document: 'X', description: '', quantity: 3.333, value: 30 },
    ];
    const entry = buildMaterialsBookEntry(ing, 1.001, 10, movements);
    expect(entry.closing.quantity).toBe(roundQty(entry.opening.quantity + entry.totalIn.quantity - entry.totalOut.quantity));
    // 1.001 + 10.125 − 3.333 = 7.793
    expect(entry.closing.quantity).toBe(7.793);
  });

  it('đánh STT tuần tự và phân loại đúng cột nhập/xuất', () => {
    const movements: StockMovement[] = [
      { date: '2026-09-02T00:00:00.000Z', direction: 'IN', type: 'IMPORT', document: 'PN001', description: '', quantity: 5, value: 100 },
      { date: '2026-09-03T00:00:00.000Z', direction: 'OUT', type: 'RETURN', document: 'TR001', description: '', quantity: 2, value: 40 },
    ];
    const entry = buildMaterialsBookEntry(ing, 0, 0, movements);
    expect(entry.rows[0].stt).toBe(1);
    expect(entry.rows[0].inQuantity).toBe(5);
    expect(entry.rows[0].outQuantity).toBe(0);
    expect(entry.rows[1].stt).toBe(2);
    expect(entry.rows[1].outQuantity).toBe(2);
    expect(entry.rows[1].inQuantity).toBe(0);
  });
});

describe('normalizeMovement', () => {
  const base = { note: null as string | null, referenceId: null as string | null, createdAt: '2026-09-01T00:00:00.000Z' };

  it('IMPORT và PROCESS_IN là chiều nhập', () => {
    expect(normalizeMovement({ ...base, type: 'IMPORT', quantity: 10, totalPrice: 200 }, 0).direction).toBe('IN');
    expect(normalizeMovement({ ...base, type: 'PROCESS_IN', quantity: 4, totalPrice: 80 }, 0).direction).toBe('IN');
  });

  it('EXPORT, PROCESS_OUT, RETURN là chiều xuất; số lượng lấy trị tuyệt đối', () => {
    expect(normalizeMovement({ ...base, type: 'EXPORT', quantity: 3, totalPrice: null }, 20).direction).toBe('OUT');
    const pout = normalizeMovement({ ...base, type: 'PROCESS_OUT', quantity: -5, totalPrice: -100 }, 0);
    expect(pout.direction).toBe('OUT');
    expect(pout.quantity).toBe(5);
    expect(pout.value).toBe(100);
    expect(normalizeMovement({ ...base, type: 'RETURN', quantity: -2, totalPrice: -40 }, 0).direction).toBe('OUT');
  });

  it('STOCKTAKE_ADJUST theo dấu số lượng', () => {
    expect(normalizeMovement({ ...base, type: 'STOCKTAKE_ADJUST', quantity: 2, totalPrice: null }, 15).direction).toBe('IN');
    expect(normalizeMovement({ ...base, type: 'STOCKTAKE_ADJUST', quantity: -2, totalPrice: null }, 15).direction).toBe('OUT');
  });

  it('không có totalPrice ⇒ giá trị = số lượng × giá vốn bình quân', () => {
    const m = normalizeMovement({ ...base, type: 'EXPORT', quantity: 4, totalPrice: null }, 25);
    expect(m.value).toBe(100); // 4 × 25
  });

  it('có totalPrice ⇒ dùng |totalPrice|', () => {
    const m = normalizeMovement({ ...base, type: 'IMPORT', quantity: 4, totalPrice: 120 }, 25);
    expect(m.value).toBe(120);
  });
});
