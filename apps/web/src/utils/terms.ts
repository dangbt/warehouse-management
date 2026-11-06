/**
 * Lớp thuật ngữ theo hồ sơ ngành. Ingredient trong code = item/SKU dùng chung mọi ngành;
 * chỉ nhãn hiển thị đổi theo profile. Thêm thuật ngữ: thêm key vào FNB (nguồn chuẩn) rồi
 * override ở profile khác nếu cần — profile thiếu key sẽ rơi về FNB.
 */
export type BusinessProfile = 'FNB' | 'FASHION' | 'RETAIL'

const FNB = {
  item: 'Nguyên liệu',
  item_lower: 'nguyên liệu',
  item_name: 'Tên nguyên liệu',
  item_info: 'Thông tin nguyên liệu',
  item_choose: 'Chọn nguyên liệu',
  item_choose_placeholder: '-- Chọn nguyên liệu --',
  item_group: 'Nhóm nguyên liệu',
  item_group_short: 'Nhóm NL',
  item_group_add: 'Thêm Nhóm Nguyên Liệu',
  item_usage_report: 'Báo cáo NL',
  item_short: 'NL',
}

export type TermKey = keyof typeof FNB
type Dict = Record<TermKey, string>

const FASHION: Dict = {
  item: 'Sản phẩm',
  item_lower: 'sản phẩm',
  item_name: 'Tên sản phẩm',
  item_info: 'Thông tin sản phẩm',
  item_choose: 'Chọn sản phẩm',
  item_choose_placeholder: '-- Chọn sản phẩm --',
  item_group: 'Danh mục',
  item_group_short: 'Danh mục',
  item_group_add: 'Thêm Danh Mục',
  item_usage_report: 'Báo cáo SP',
  item_short: 'SP',
}

const RETAIL: Dict = {
  item: 'Hàng hoá',
  item_lower: 'hàng hoá',
  item_name: 'Tên hàng hoá',
  item_info: 'Thông tin hàng hoá',
  item_choose: 'Chọn hàng hoá',
  item_choose_placeholder: '-- Chọn hàng hoá --',
  item_group: 'Nhóm hàng',
  item_group_short: 'Nhóm hàng',
  item_group_add: 'Thêm Nhóm Hàng',
  item_usage_report: 'Báo cáo hàng hoá',
  item_short: 'HH',
}

export const TERMS: Record<BusinessProfile, Dict> = { FNB, FASHION, RETAIL }

export function getTerm(profile: BusinessProfile, key: TermKey): string {
  return TERMS[profile]?.[key] ?? FNB[key]
}
