import { formatVoucherNo, maxSequence, parseVoucherDate } from './voucher.service';

describe('voucher numbering', () => {
  it('đệm 0 theo số chữ số', () => {
    expect(formatVoucherNo('NK', 7, 5)).toBe('NK00007');
    expect(formatVoucherNo('XK', 123456, 3)).toBe('XK123456');
  });

  it('lấy số lớn nhất theo tiền tố, bỏ qua mã cũ/khác tiền tố', () => {
    expect(maxSequence('NK', ['NK00001', 'NK00010', 'PN-20260101-1234', 'NKX1', 'XK00099'])).toBe(10);
    expect(maxSequence('NK', [])).toBe(0);
  });

  it('parse ngày chứng từ', () => {
    expect(parseVoucherDate('2026-05-01T00:00:00.000Z').toISOString()).toBe('2026-05-01T00:00:00.000Z');
    expect(() => parseVoucherDate('abc')).toThrow();
  });
});
