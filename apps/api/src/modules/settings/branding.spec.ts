import { DEFAULT_BRANDING, initialsOf, sanitizeBranding } from './branding';

describe('branding', () => {
  it('mặc định là Mâm Vị', () => {
    expect(sanitizeBranding(undefined)).toEqual(DEFAULT_BRANDING);
    expect(DEFAULT_BRANDING.name).toBe('Mâm Vị');
  });

  it('giữ giá trị hợp lệ, bỏ giá trị sai', () => {
    const b = sanitizeBranding({ name: ' Shop A ', logoUrl: 'https://x/y.png', primaryColor: 'red', shortName: 'toolong' });
    expect(b.name).toBe('Shop A');
    expect(b.logoUrl).toBe('https://x/y.png');
    expect(b.primaryColor).toBeNull();
    expect(b.shortName).toBe(DEFAULT_BRANDING.shortName);
  });

  it('nhận màu hex và cho phép xoá màu', () => {
    expect(sanitizeBranding({ primaryColor: '#112233' }).primaryColor).toBe('#112233');
    expect(sanitizeBranding({ primaryColor: '' }, { ...DEFAULT_BRANDING, primaryColor: '#112233' }).primaryColor).toBeNull();
  });

  it('initialsOf lấy chữ cái đầu', () => {
    expect(initialsOf('Shop Thời Trang')).toBe('ST');
    expect(initialsOf('   ')).toBe('MV');
  });
});
