import { computeLineVat, roundVnd } from './import-orders.service';

describe('roundVnd', () => {
  it('làm tròn về đồng (0 chữ số thập phân)', () => {
    expect(roundVnd(100.4)).toBe(100);
    expect(roundVnd(100.5)).toBe(101);
    expect(roundVnd(99999.6)).toBe(100000);
  });
});

describe('computeLineVat', () => {
  it('null ⇒ 0 (không có hoá đơn/không thuế)', () => {
    expect(computeLineVat(1000000, null)).toBe(0);
  });

  it('mã không chịu thuế ⇒ 0', () => {
    expect(computeLineVat(1000000, '0')).toBe(0);
    expect(computeLineVat(1000000, 'KCT')).toBe(0);
    expect(computeLineVat(1000000, 'KKKNT')).toBe(0);
  });

  it('tính đúng VAT theo dòng cho thuế suất 8% và 10%', () => {
    // Acceptance: phiếu 2 dòng 8% và 10%.
    expect(computeLineVat(1000000, '8')).toBe(80000);
    expect(computeLineVat(2000000, '10')).toBe(200000);
  });

  it('làm tròn tiền thuế về đồng theo từng dòng', () => {
    // 333333 × 8% = 26666.64 ⇒ 26667.
    expect(computeLineVat(333333, '8')).toBe(26667);
    // 12345 × 10% = 1234.5 ⇒ 1235.
    expect(computeLineVat(12345, '10')).toBe(1235);
  });
});
