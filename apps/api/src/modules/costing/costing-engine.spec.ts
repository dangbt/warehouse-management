import { costLedger, directionOf, LedgerEntry } from './costing-engine';

// Bộ dữ liệu mẫu: nhập 100 @10 → xuất 50 → nhập 100 @16 → xuất 100
const sample = (): LedgerEntry[] => [
  { id: 'in1', direction: 'IN', qty: 100, totalCost: 1000, inPeriod: true },
  { id: 'out1', direction: 'OUT', qty: 50, totalCost: null, inPeriod: true },
  { id: 'in2', direction: 'IN', qty: 100, totalCost: 1600, inPeriod: true },
  { id: 'out2', direction: 'OUT', qty: 100, totalCost: null, inPeriod: true },
];

describe('costLedger — 3 phương pháp trên cùng bộ dữ liệu', () => {
  it('AVG_MOVING: xuất 1 = 50×10 = 500; tồn 50 (500) + nhập 1600 → bình quân 14 → xuất 2 = 1400', () => {
    const r = costLedger('AVG_MOVING', sample());
    expect(r.get('out1')).toEqual({ unitCost: 10, totalCost: 500 });
    expect(r.get('out2')).toEqual({ unitCost: 14, totalCost: 1400 });
  });

  it('FIFO: xuất 1 = 500; xuất 2 = 50×10 + 50×16 = 1300 (bình quân 13)', () => {
    const r = costLedger('FIFO', sample());
    expect(r.get('out1')).toEqual({ unitCost: 10, totalCost: 500 });
    expect(r.get('out2')).toEqual({ unitCost: 13, totalCost: 1300 });
  });

  it('AVG_PERIOD: bình quân kỳ = 2600/200 = 13 → xuất 1 = 650, xuất 2 = 1300', () => {
    const r = costLedger('AVG_PERIOD', sample());
    expect(r.get('out1')).toEqual({ unitCost: 13, totalCost: 650 });
    expect(r.get('out2')).toEqual({ unitCost: 13, totalCost: 1300 });
  });

  it('AVG_PERIOD có tồn đầu kỳ: (GT đầu + GT nhập)/(SL đầu + SL nhập)', () => {
    const entries: LedgerEntry[] = [
      { id: 'o1', direction: 'IN', qty: 20, totalCost: 200, inPeriod: false },
      { id: 'o2', direction: 'OUT', qty: 10, totalCost: 100, inPeriod: false }, // đầu kỳ còn 10 SL, GT 100
      { id: 'in', direction: 'IN', qty: 30, totalCost: 540, inPeriod: true },
      { id: 'out', direction: 'OUT', qty: 8, totalCost: null, inPeriod: true },
    ];
    // (100 + 540) / (10 + 30) = 16
    expect(costLedger('AVG_PERIOD', entries).get('out')).toEqual({ unitCost: 16, totalCost: 128 });
  });

  it('chạy lại nhiều lần cho cùng kết quả (idempotent)', () => {
    for (const m of ['AVG_PERIOD', 'AVG_MOVING', 'FIFO'] as const) {
      expect([...costLedger(m, sample())]).toEqual([...costLedger(m, sample())]);
    }
  });

  it('chỉ trả giá cho xuất trong kỳ; xuất vượt tồn dùng giá dự phòng', () => {
    const entries: LedgerEntry[] = [{ id: 'x', direction: 'OUT', qty: 5, totalCost: null, inPeriod: true }];
    expect(costLedger('FIFO', entries, 7).get('x')).toEqual({ unitCost: 7, totalCost: 35 });
    expect(costLedger('AVG_PERIOD', entries, 7).get('x')).toEqual({ unitCost: 7, totalCost: 35 });
  });

  it('xuất hết tồn lấy trọn giá trị còn lại (không dư lẻ làm tròn)', () => {
    const entries: LedgerEntry[] = [
      { id: 'i', direction: 'IN', qty: 3, totalCost: 100, inPeriod: true },
      { id: 'x', direction: 'OUT', qty: 3, totalCost: null, inPeriod: true },
    ];
    expect(costLedger('AVG_MOVING', entries).get('x')?.totalCost).toBe(100);
  });
});

describe('directionOf', () => {
  it('phân chiều theo loại, điều chỉnh kiểm kê theo dấu', () => {
    expect(directionOf('IMPORT', 1)).toBe('IN');
    expect(directionOf('ORDER_DEDUCT', -1)).toBe('OUT');
    expect(directionOf('STOCKTAKE_ADJUST', -2)).toBe('OUT');
    expect(directionOf('STOCKTAKE_ADJUST', 2)).toBe('IN');
  });
});
