import { toNum, voucherDateFilter } from './voucher-date-filter';

describe('voucherDateFilter', () => {
  it('không truyền biên → undefined', () => {
    expect(voucherDateFilter({})).toBeUndefined();
  });

  it('chỉ một biên from → chỉ có gte', () => {
    const r = voucherDateFilter({ from: '2026-11-01' });
    expect(r?.gte).toBeInstanceOf(Date);
    expect(r?.lte).toBeUndefined();
  });

  it('chỉ một biên to → chỉ có lte', () => {
    const r = voucherDateFilter({ to: '2026-11-30' });
    expect(r?.lte).toBeInstanceOf(Date);
    expect(r?.gte).toBeUndefined();
  });

  it('chuỗi không hợp lệ → bỏ qua', () => {
    expect(voucherDateFilter({ from: 'abc', to: 'xyz' })).toBeUndefined();
  });

  it('from < to khi truyền cả hai', () => {
    const r = voucherDateFilter({ from: '2026-11-01', to: '2026-11-01' });
    expect(r!.gte!.getTime()).toBeLessThan(r!.lte!.getTime());
  });
});

describe('toNum', () => {
  it('null/undefined → 0, Decimal-like → number', () => {
    expect(toNum(null)).toBe(0);
    expect(toNum(undefined)).toBe(0);
    expect(toNum('12.5')).toBe(12.5);
  });
});
