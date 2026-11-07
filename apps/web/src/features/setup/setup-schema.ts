import { z } from 'zod'

export const setupSchema = z.object({
  profile: z.enum(['FNB', 'FASHION', 'RETAIL']),
  companyName: z.string().trim().min(1, 'Vui lòng nhập tên doanh nghiệp'),
  taxCode: z
    .string()
    .trim()
    .refine((v) => v === '' || /^(\d{10}|\d{13}|\d{10}-\d{3})$/.test(v), 'Mã số thuế phải có 10 hoặc 13 chữ số'),
  address: z.string().trim(),
  taxRegime: z.enum(['VAT_DEDUCTION', 'HOUSEHOLD']),
  logoUrl: z.string().trim(),
  fullName: z.string().trim().min(1, 'Vui lòng nhập họ tên'),
  email: z.string().min(1, 'Vui lòng nhập email').email('Email không hợp lệ'),
  password: z.string().min(6, 'Mật khẩu tối thiểu 6 ký tự'),
})
export type SetupForm = z.infer<typeof setupSchema>

export const PROFILE_OPTIONS = [
  { value: 'FNB', label: 'F&B (nhà hàng / quán ăn)' },
  { value: 'FASHION', label: 'Thời trang' },
  { value: 'RETAIL', label: 'Bán lẻ' },
] as const

export const REGIME_OPTIONS = [
  { value: 'VAT_DEDUCTION', label: 'Doanh nghiệp — GTGT khấu trừ' },
  { value: 'HOUSEHOLD', label: 'Hộ kinh doanh' },
] as const

export function toPayload(d: SetupForm) {
  return {
    profile: d.profile,
    admin: { email: d.email, password: d.password, fullName: d.fullName },
    company: { name: d.companyName, taxCode: d.taxCode, address: d.address },
    taxRegime: d.taxRegime,
    brand: { name: d.companyName, ...(d.logoUrl ? { logoUrl: d.logoUrl } : {}) },
  }
}
