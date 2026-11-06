import { buildInventorySummary, InventorySummaryRawRow } from './inventory-summary';

const row = (o: Partial<InventorySummaryRawRow>): InventorySummaryRawRow => ({
  ingredientId: 'i1',
  code: 'I1',
  name: 'Thịt',
  unit: 'kg',
  groupId: 'g1',
  groupName: 'Thịt',
  openingQty: 0,
  openingValue: 0,
  inQty: 0,
  inValue: 0,
  outQty: 0,
  outValue: 0,
  ...o,
});

describe('buildInventorySummary', () => {
  it('cuối kỳ = đầu kỳ + nhập − xuất (SL và giá trị)', () => {
    const r = buildInventorySummary(
      [row({ openingQty: 10, openingValue: 1000, inQty: 5, inValue: 600, outQty: 3, outValue: 330 })],
      '2026-11-01',
      '2026-11-30',
    );
    expect(r.groups[0].rows[0].closing).toEqual({ qty: 12, value: 1270 });
  });

  it('có dòng tổng nhóm và tổng cộng, nhóm chưa phân nhóm xếp cuối, tồn âm giữ nguyên dấu', () => {
    const r = buildInventorySummary(
      [
        row({ ingredientId: 'a', name: 'A', openingQty: 2, openingValue: 200, inQty: 1, inValue: 100 }),
        row({ ingredientId: 'b', name: 'B', openingQty: 1, openingValue: 50, outQty: 4, outValue: 200 }),
        row({ ingredientId: 'c', name: 'C', groupId: null, groupName: null, inQty: 7, inValue: 70 }),
      ],
      '2026-11-01',
      '2026-11-30',
    );
    expect(r.groups.map((g) => g.groupName)).toEqual(['Thịt', 'Chưa phân nhóm']);
    expect(r.groups[0].total.closing).toEqual({ qty: 0, value: 150 });
    expect(r.groups[0].rows[1].closing).toEqual({ qty: -3, value: -150 });
    expect(r.grandTotal.opening).toEqual({ qty: 3, value: 250 });
    expect(r.grandTotal.inbound).toEqual({ qty: 8, value: 170 });
    expect(r.grandTotal.outbound).toEqual({ qty: 4, value: 200 });
    expect(r.grandTotal.closing).toEqual({ qty: 7, value: 220 });
  });
});
