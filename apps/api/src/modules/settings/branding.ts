/** Branding hiển thị (tên, logo, màu chủ đạo). Mặc định = Kho Việt (open-source default). */
export interface Branding {
  name: string;
  shortName: string;
  logoUrl: string;
  primaryColor: string | null;
}

export const BRANDING_KEY = 'branding';

export const DEFAULT_BRANDING: Branding = {
  name: 'Kho Việt',
  shortName: 'KV',
  logoUrl: '/logo.svg',
  primaryColor: null,
};

const HEX = /^#[0-9a-fA-F]{6}$/;

function str(v: unknown, max: number): string | undefined {
  return typeof v === 'string' && v.trim() && v.trim().length <= max ? v.trim() : undefined;
}

/** Lọc input thành Branding hợp lệ, phần thiếu/sai lấy từ `base`. */
export function sanitizeBranding(raw: unknown, base: Branding = DEFAULT_BRANDING): Branding {
  const r = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const color =
    r.primaryColor === null || r.primaryColor === ''
      ? null
      : typeof r.primaryColor === 'string' && HEX.test(r.primaryColor)
        ? r.primaryColor
        : base.primaryColor;
  return {
    name: str(r.name, 60) ?? base.name,
    shortName: str(r.shortName, 4) ?? base.shortName,
    logoUrl: str(r.logoUrl, 500) ?? base.logoUrl,
    primaryColor: color,
  };
}

/** Viết tắt từ tên: lấy chữ cái đầu tối đa 2 từ đầu. */
export function initialsOf(name: string): string {
  const s = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
  return s || DEFAULT_BRANDING.shortName;
}
