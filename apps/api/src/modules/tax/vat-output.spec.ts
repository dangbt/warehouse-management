import { splitLineTax, allocateDiscount } from './vat';

describe('splitLineTax', () => {
  describe('giá đã gồm VAT (pricesIncludeVat = true)', () => {
    it('tách 110.000 @10% → 100.000 chưa thuế + 10.000 thuế', () => {
      expect(splitLineTax({ lineGross: 110000, rate: '10', pricesIncludeVat: true })).toEqual({
        amountBeforeTax: 100000,
        vatAmount: 10000,
      });
    });

    it('tách 108.000 @8% → 100.000 chưa thuế + 8.000 thuế', () => {
      expect(splitLineTax({ lineGross: 108000, rate: '8', pricesIncludeVat: true })).toEqual({
        amountBeforeTax: 100000,
        vatAmount: 8000,
      });
    });

    it('luôn thoả before + vat = round(gross) dù có lẻ đồng', () => {
      const r = splitLineTax({ lineGross: 99999, rate: '8', pricesIncludeVat: true });
      expect(r.amountBeforeTax + r.vatAmount).toBe(99999);
    });
  });

  describe('giá chưa gồm VAT (pricesIncludeVat = false)', () => {
    it('tách 100.000 @10% → 100.000 chưa thuế + 10.000 thuế', () => {
      expect(splitLineTax({ lineGross: 100000, rate: '10', pricesIncludeVat: false })).toEqual({
        amountBeforeTax: 100000,
        vatAmount: 10000,
      });
    });

    it('tách 100.000 @8% → 100.000 chưa thuế + 8.000 thuế', () => {
      expect(splitLineTax({ lineGross: 100000, rate: '8', pricesIncludeVat: false })).toEqual({
        amountBeforeTax: 100000,
        vatAmount: 8000,
      });
    });
  });

  describe('mã không chịu thuế / null', () => {
    it('rate 0% ⇒ thuế 0, chưa thuế = gross (mọi cấu hình)', () => {
      expect(splitLineTax({ lineGross: 50000, rate: '0', pricesIncludeVat: true })).toEqual({ amountBeforeTax: 50000, vatAmount: 0 });
      expect(splitLineTax({ lineGross: 50000, rate: 'KCT', pricesIncludeVat: false })).toEqual({ amountBeforeTax: 50000, vatAmount: 0 });
    });

    it('rate null ⇒ thuế 0, chưa thuế = round(gross)', () => {
      expect(splitLineTax({ lineGross: 50000.4, rate: null, pricesIncludeVat: true })).toEqual({ amountBeforeTax: 50000, vatAmount: 0 });
    });
  });
});

describe('allocateDiscount', () => {
  it('không có chiết khấu: Σ lineGross = orderTotal ⇒ giữ nguyên', () => {
    expect(allocateDiscount([60000, 40000], 100000)).toEqual([60000, 40000]);
  });

  it('có chiết khấu cấp hoá đơn: phân bổ theo tỷ lệ, tổng khớp đúng orderTotal', () => {
    // Σ lineGross = 100.000 nhưng đơn chỉ thu 90.000 (giảm 10%).
    const alloc = allocateDiscount([60000, 40000], 90000);
    expect(alloc.reduce((s, x) => s + x, 0)).toBe(90000);
    expect(alloc).toEqual([54000, 36000]);
  });

  it('dòng cuối nhận phần dư khi tỷ lệ lẻ, tổng vẫn khớp', () => {
    const grosses = [33333, 33333, 33334];
    const alloc = allocateDiscount(grosses, 90000);
    expect(alloc.reduce((s, x) => s + x, 0)).toBe(90000);
  });

  it('Σ lineGross = 0 ⇒ dồn toàn bộ vào dòng cuối', () => {
    expect(allocateDiscount([0, 0, 0], 30000)).toEqual([0, 0, 30000]);
  });

  it('mảng rỗng ⇒ mảng rỗng', () => {
    expect(allocateDiscount([], 10000)).toEqual([]);
  });

  it('làm tròn orderTotal về đồng', () => {
    const alloc = allocateDiscount([100], 99999.6);
    expect(alloc).toEqual([100000]);
  });
});
