import { computeVatDeduction, computeHousehold } from './summary';

describe('computeVatDeduction', () => {
  it('đầu ra > đầu vào ⇒ phải nộp dương, không kết chuyển', () => {
    const r = computeVatDeduction({ outputVat: 10_000_000, inputVat: 4_000_000, carriedForwardIn: 0 });
    expect(r.payable).toBe(6_000_000);
    expect(r.carryToNext).toBe(0);
  });

  it('đầu vào > đầu ra ⇒ phải nộp = 0, kết chuyển dương', () => {
    const r = computeVatDeduction({ outputVat: 3_000_000, inputVat: 8_000_000, carriedForwardIn: 0 });
    expect(r.payable).toBe(0);
    expect(r.carryToNext).toBe(5_000_000);
  });

  it('có kết chuyển kỳ trước làm giảm số phải nộp', () => {
    const r = computeVatDeduction({ outputVat: 10_000_000, inputVat: 4_000_000, carriedForwardIn: 2_000_000 });
    expect(r.payable).toBe(4_000_000);
    expect(r.carryToNext).toBe(0);
  });

  it('kết chuyển kỳ trước lớn hơn chênh lệch ⇒ phải nộp = 0, phần dư kết chuyển tiếp', () => {
    const r = computeVatDeduction({ outputVat: 10_000_000, inputVat: 4_000_000, carriedForwardIn: 9_000_000 });
    expect(r.payable).toBe(0);
    expect(r.carryToNext).toBe(3_000_000); // 4tr + 9tr - 10tr
  });

  it('đầu ra bằng đầu vào + kết chuyển ⇒ cả hai bằng 0', () => {
    const r = computeVatDeduction({ outputVat: 6_000_000, inputVat: 4_000_000, carriedForwardIn: 2_000_000 });
    expect(r.payable).toBe(0);
    expect(r.carryToNext).toBe(0);
  });

  it('carriedForwardIn âm bị kẹp về 0 (không làm tăng thuế phải nộp)', () => {
    const r = computeVatDeduction({ outputVat: 5_000_000, inputVat: 1_000_000, carriedForwardIn: -3_000_000 });
    expect(r.carriedForwardIn).toBe(0);
    expect(r.payable).toBe(4_000_000);
    expect(r.carryToNext).toBe(0);
  });

  it('làm tròn các đầu vào về đồng trước khi tính', () => {
    const r = computeVatDeduction({ outputVat: 100.6, inputVat: 40.2, carriedForwardIn: 10.4 });
    expect(r.outputVat).toBe(101);
    expect(r.inputVat).toBe(40);
    expect(r.carriedForwardIn).toBe(10);
    expect(r.payable).toBe(51);
    expect(r.carryToNext).toBe(0);
  });
});

describe('computeHousehold', () => {
  const base = { vatPercent: 3, pitPercent: 1.5, exemptThreshold: 200_000_000 };

  it('trên ngưỡng ⇒ tính % trên doanh thu kỳ', () => {
    const r = computeHousehold({ revenue: 100_000_000, yearToDateRevenue: 300_000_000, ...base });
    expect(r.belowExemptThreshold).toBe(false);
    expect(r.vat).toBe(3_000_000); // 100tr × 3%
    expect(r.pit).toBe(1_500_000); // 100tr × 1.5%
  });

  it('luỹ kế năm dưới ngưỡng ⇒ miễn thuế, vat/pit = 0', () => {
    const r = computeHousehold({ revenue: 50_000_000, yearToDateRevenue: 150_000_000, ...base });
    expect(r.belowExemptThreshold).toBe(true);
    expect(r.vat).toBe(0);
    expect(r.pit).toBe(0);
  });

  it('luỹ kế đúng bằng ngưỡng ⇒ vẫn miễn (≤)', () => {
    const r = computeHousehold({ revenue: 80_000_000, yearToDateRevenue: 200_000_000, ...base });
    expect(r.belowExemptThreshold).toBe(true);
    expect(r.vat).toBe(0);
    expect(r.pit).toBe(0);
  });

  it('vượt ngưỡng 1 đồng ⇒ hết miễn, tính đủ trên doanh thu kỳ', () => {
    const r = computeHousehold({ revenue: 200_000_001, yearToDateRevenue: 200_000_001, ...base });
    expect(r.belowExemptThreshold).toBe(false);
    expect(r.vat).toBe(6_000_000); // round(200000001 × 3%)
    expect(r.pit).toBe(3_000_000); // round(200000001 × 1.5%)
  });

  it('làm tròn tiền thuế về đồng', () => {
    const r = computeHousehold({ revenue: 3_333_333, yearToDateRevenue: 500_000_000, ...base });
    expect(r.vat).toBe(Math.round(3_333_333 * 0.03));
    expect(r.pit).toBe(Math.round(3_333_333 * 0.015));
  });
});
