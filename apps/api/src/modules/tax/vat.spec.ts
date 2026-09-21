import { computeUnitCost, vatRatePercent, VAT_RATES } from './vat';

describe('vatRatePercent', () => {
  it('trả về đúng phần trăm cho thuế suất có số', () => {
    expect(vatRatePercent('5')).toBe(5);
    expect(vatRatePercent('8')).toBe(8);
    expect(vatRatePercent('10')).toBe(10);
  });

  it('trả về 0 cho các mã không chịu thuế', () => {
    expect(vatRatePercent('0')).toBe(0);
    expect(vatRatePercent('KCT')).toBe(0);
    expect(vatRatePercent('KKKNT')).toBe(0);
  });

  it('bao phủ mọi mã trong VAT_RATES', () => {
    for (const rate of VAT_RATES) {
      expect(typeof vatRatePercent(rate)).toBe('number');
    }
  });
});

describe('computeUnitCost', () => {
  describe('chế độ VAT_DEDUCTION (khấu trừ)', () => {
    it('giá vốn = giá chưa thuế bất kể thuế suất', () => {
      expect(computeUnitCost(100000, '10', 'VAT_DEDUCTION')).toBe(100000);
      expect(computeUnitCost(100000, '8', 'VAT_DEDUCTION')).toBe(100000);
      expect(computeUnitCost(100000, null, 'VAT_DEDUCTION')).toBe(100000);
    });
  });

  describe('chế độ HOUSEHOLD (hộ kinh doanh)', () => {
    it('cộng VAT vào giá vốn khi có thuế suất', () => {
      expect(computeUnitCost(100000, '10', 'HOUSEHOLD')).toBe(110000);
      expect(computeUnitCost(100000, '8', 'HOUSEHOLD')).toBe(108000);
      expect(computeUnitCost(100000, '5', 'HOUSEHOLD')).toBe(105000);
    });

    it('không cộng gì với mã không chịu thuế hoặc null', () => {
      expect(computeUnitCost(100000, '0', 'HOUSEHOLD')).toBe(100000);
      expect(computeUnitCost(100000, 'KCT', 'HOUSEHOLD')).toBe(100000);
      expect(computeUnitCost(100000, null, 'HOUSEHOLD')).toBe(100000);
    });
  });
});
