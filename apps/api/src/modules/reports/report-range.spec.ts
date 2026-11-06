import { resolveReportRange } from './report-range';

describe('resolveReportRange (biên ngày giờ VN)', () => {
  it('chuỗi ngày chỉ-ngày: ngày đầu kỳ 00:00 VN và ngày cuối kỳ 23:59:59.999 VN', () => {
    const r = resolveReportRange({ from: '2026-11-01', to: '2026-11-30' });
    expect(r.from.toISOString()).toBe('2026-10-31T17:00:00.000Z');
    expect(r.to.toISOString()).toBe('2026-11-30T16:59:59.999Z');
  });

  it('ISO do client gửi được giữ nguyên biên', () => {
    const r = resolveReportRange({ from: '2026-10-31T17:00:00.000Z', to: '2026-11-30T16:59:59.999Z' });
    expect(r.from.toISOString()).toBe('2026-10-31T17:00:00.000Z');
    expect(r.to.toISOString()).toBe('2026-11-30T16:59:59.999Z');
  });

  it('ngày CT ngày đầu và ngày cuối kỳ nằm trong khoảng, ngày liền kề nằm ngoài', () => {
    const { from, to } = resolveReportRange({ from: '2026-11-01', to: '2026-11-30' });
    const inRange = (iso: string) => new Date(iso) >= from && new Date(iso) <= to;
    expect(inRange('2026-10-31T17:00:00.000Z')).toBe(true); // 01/11 VN
    expect(inRange('2026-11-29T17:00:00.000Z')).toBe(true); // 30/11 VN
    expect(inRange('2026-10-31T16:59:59.999Z')).toBe(false); // 31/10 VN
    expect(inRange('2026-11-30T17:00:00.000Z')).toBe(false); // 01/12 VN
  });

  it('mặc định tháng: từ mùng 1 giờ VN dù server chạy UTC', () => {
    const now = new Date('2026-11-15T20:00:00.000Z'); // 16/11 03:00 VN
    const r = resolveReportRange({ period: 'month' }, now);
    expect(r.from.toISOString()).toBe('2026-10-31T17:00:00.000Z');
    expect(r.to.toISOString()).toBe('2026-11-16T16:59:59.999Z');
  });

  it('mặc định tuần: bắt đầu thứ Hai giờ VN', () => {
    const now = new Date('2026-11-06T03:00:00.000Z'); // Thứ Sáu 06/11 VN
    const r = resolveReportRange({}, now);
    expect(r.from.toISOString()).toBe('2026-11-01T17:00:00.000Z'); // Thứ Hai 02/11 VN
  });
});
