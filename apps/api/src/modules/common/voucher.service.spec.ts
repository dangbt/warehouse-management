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

import { VoucherService, VOUCHER_NO_DUPLICATE } from './voucher.service';

describe('VoucherService.resolveNo', () => {
  const make = (count: number) => {
    const prisma = {
      importOrder: { count: jest.fn().mockResolvedValue(count) },
      voucherConfig: { findMany: jest.fn().mockResolvedValue([]) },
    };

    return new VoucherService(prisma as any);
  };

  it('số nhập tay bị trùng ⇒ 409 kèm code VOUCHER_NO_DUPLICATE', async () => {
    await expect(make(1).resolveNo('IMPORT', 'NK00001')).rejects.toMatchObject({
      status: 409,
      response: expect.objectContaining({ code: VOUCHER_NO_DUPLICATE }),
    });
  });

  it('số nhập tay chưa tồn tại ⇒ dùng nguyên số đó', async () => {
    await expect(make(0).resolveNo('IMPORT', ' ABC-1 ')).resolves.toBe('ABC-1');
  });

  it('rethrowUnique: P2002 ⇒ 409 có code', () => {
    expect(() => make(0).rethrowUnique({ code: 'P2002' }, 'NK1')).toThrow(expect.objectContaining({ status: 409 }));
  });
});
