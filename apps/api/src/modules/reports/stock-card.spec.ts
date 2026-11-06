import { buildInventorySummary } from './inventory-summary';
import { buildStockCard, StockCardRawTx } from './stock-card';

const ing = { id: 'i1', code: 'I1', name: 'Thịt', unit: 'kg' };
const tx = (id: string, day: number, qty: number, value: number, type = qty > 0 ? 'IMPORT' : 'EXPORT'): StockCardRawTx => ({
  id,
  voucherDate: new Date(Date.UTC(2026, 10, day)),
  type,
  qty,
  value,
  voucherNo: `CT${id}`,
  docType: null,
  docId: null,
  note: null,
});

describe('buildStockCard', () => {
  const txs = [tx('1', 2, 5, 600), tx('2', 3, -3, -330), tx('3', 5, 4, 480), tx('4', 6, -6, -700)];
  const card = buildStockCard(ing, { qty: 10, value: 1000 }, txs, '2026-11-01', '2026-11-30');

  it('tồn lũy kế đúng khi nhập/xuất xen kẽ từ tồn đầu kỳ', () => {
    expect(card.lines.map((l) => l.balanceQty)).toEqual([15, 12, 16, 10]);
    expect(card.lines.map((l) => l.balanceValue)).toEqual([1600, 1270, 1750, 1050]);
  });

  it('tách cột nhập/xuất, cộng phát sinh, tồn cuối kỳ', () => {
    expect(card.lines[1]).toMatchObject({ inQty: 0, outQty: 3, outValue: 330, unitPrice: 110 });
    expect(card.totals).toEqual({ inQty: 9, outQty: 9, inValue: 1080, outValue: 1030 });
    expect(card.closing).toEqual({ qty: 10, value: 1050 });
  });

  it('tồn cuối kỳ khớp cột cuối kỳ báo cáo NXT cùng số liệu', () => {
    const nxt = buildInventorySummary(
      [
        {
          ingredientId: 'i1',
          code: 'I1',
          name: 'Thịt',
          unit: 'kg',
          groupId: null,
          groupName: null,
          openingQty: 10,
          openingValue: 1000,
          inQty: 9,
          inValue: 1080,
          outQty: 9,
          outValue: 1030,
        },
      ],
      '2026-11-01',
      '2026-11-30',
    );
    expect(card.closing).toEqual(nxt.groups[0].rows[0].closing);
  });

  it('kỳ không có giao dịch: cuối kỳ = đầu kỳ', () => {
    const c = buildStockCard(ing, { qty: 4, value: 40 }, [], '2026-11-01', '2026-11-30');
    expect(c.lines).toEqual([]);
    expect(c.closing).toEqual({ qty: 4, value: 40 });
  });
});
