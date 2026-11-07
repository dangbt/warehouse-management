import type { InventorySummaryRawRow } from './inventory-summary';
import { buildInventorySummary } from './inventory-summary';
import { buildInventorySummaryByProduct } from './inventory-summary-by-product';

const row = (o: Partial<InventorySummaryRawRow>): InventorySummaryRawRow => ({
  ingredientId: 'i1',
  code: 'I1',
  name: 'Áo',
  unit: 'cái',
  groupId: 'g1',
  groupName: 'Áo',
  openingQty: 0,
  openingValue: 0,
  inQty: 0,
  inValue: 0,
  outQty: 0,
  outValue: 0,
  productId: 'p1',
  productCode: 'AO01',
  productName: 'Áo thun',
  ...o,
});

const raw = [
  row({
    ingredientId: 'v1',
    code: 'AO01-DO-M',
    variantLabel: 'Đỏ / M',
    openingQty: 10,
    openingValue: 1000,
    inQty: 5,
    inValue: 600,
    outQty: 3,
    outValue: 330,
  }),
  row({
    ingredientId: 'v2',
    code: 'AO01-DO-L',
    variantLabel: 'Đỏ / L',
    openingQty: 4,
    openingValue: 400,
    inQty: 2,
    inValue: 240,
    outQty: 6,
    outValue: 650,
  }),
  row({
    ingredientId: 'x',
    code: 'X',
    name: 'Nước',
    productId: null,
    productCode: null,
    productName: null,
    groupId: null,
    groupName: null,
    inQty: 7,
    inValue: 70,
  }),
];

describe('buildInventorySummaryByProduct', () => {
  it('dòng SP = tổng các biến thể (SL và giá trị, cả 4 cột)', () => {
    const r = buildInventorySummaryByProduct(raw, '2026-11-01', '2026-11-30');
    const p = r.groups[0].rows[0];
    expect(p.variants).toHaveLength(2);
    for (const k of ['opening', 'inbound', 'outbound', 'closing'] as const) {
      expect(p[k].qty).toBeCloseTo(p.variants!.reduce((s, v) => s + v[k].qty, 0));
      expect(p[k].value).toBeCloseTo(p.variants!.reduce((s, v) => s + v[k].value, 0));
    }
    expect(p.closing).toEqual({ qty: 12, value: 1260 });
    expect(p.code).toBe('AO01');
  });

  it('tổng cộng giống báo cáo không gộp; NL không thuộc SP giữ dòng riêng', () => {
    const merged = buildInventorySummaryByProduct(raw, 'a', 'b');
    const flat = buildInventorySummary(raw, 'a', 'b');
    expect(merged.grandTotal).toEqual(flat.grandTotal);
    expect(merged.groups.map((g) => g.total)).toEqual(flat.groups.map((g) => g.total));
    expect(merged.groups[1].rows[0].variants).toBeUndefined();
  });
});
