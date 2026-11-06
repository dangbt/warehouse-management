/** Giới hạn dòng dữ liệu mỗi file nhập Excel. */
export const MAX_IMPORT_ROWS = 2000

export type ColumnKey =
  | 'voucherDate'
  | 'voucherNo'
  | 'partner'
  | 'invoiceNo'
  | 'invoiceSymbol'
  | 'invoiceDate'
  | 'ingredient'
  | 'quantity'
  | 'factor'
  | 'unitPrice'
  | 'vatRate'
  | 'expiry'
  | 'note'

export interface ImportColumn {
  key: ColumnKey
  header: string
  width: number
  required?: boolean
  /** Mô tả ở sheet hướng dẫn. */
  help: string
}

/** Cột của file mẫu (thứ tự cố định khi xuất; khi đọc khớp theo tên cột nên đảo thứ tự vẫn được). */
export const IMPORT_COLUMNS: ImportColumn[] = [
  { key: 'voucherDate', header: 'Ngày CT', width: 12, help: 'Ngày chứng từ, dạng dd/mm/yyyy. Bỏ trống = hôm nay.' },
  { key: 'voucherNo', header: 'Số CT', width: 14, help: 'Số chứng từ. Nhiều dòng cùng Số CT = 1 phiếu. Bỏ trống: mỗi NCC + ngày (+ số HĐ) = 1 phiếu, hệ thống tự cấp số.' },
  { key: 'partner', header: 'Mã/Tên NCC hoặc MST', width: 26, required: true, help: 'Tên nhà cung cấp (đúng như danh mục) hoặc mã số thuế.' },
  { key: 'invoiceNo', header: 'Số HĐ', width: 12, help: 'Số hoá đơn. Có số HĐ ⇒ phiếu có hoá đơn (bắt buộc Ngày HĐ + Thuế suất).' },
  { key: 'invoiceSymbol', header: 'Ký hiệu', width: 10, help: 'Ký hiệu hoá đơn, vd C26TAA.' },
  { key: 'invoiceDate', header: 'Ngày HĐ', width: 12, help: 'Ngày hoá đơn, dạng dd/mm/yyyy.' },
  { key: 'ingredient', header: 'Tên/Mã NL', width: 26, required: true, help: 'Tên nguyên liệu đúng như danh mục. Chưa khớp thì chọn lại trong màn hình xem trước.' },
  { key: 'quantity', header: 'Số lượng', width: 11, required: true, help: 'Số lượng theo đơn vị nhập, > 0.' },
  { key: 'factor', header: 'Hệ số', width: 9, help: 'Quy đổi đơn vị nhập → đơn vị tồn (vd 1 thùng = 24 chai ⇒ 24). Bỏ trống = 1.' },
  { key: 'unitPrice', header: 'Đơn giá', width: 12, required: true, help: 'Đơn giá theo đơn vị tồn, >= 0.' },
  { key: 'vatRate', header: 'Thuế suất', width: 11, help: 'Chọn trong danh sách: 0, 5, 8, 10, KCT, KKKNT. Bắt buộc khi có Số HĐ.' },
  { key: 'expiry', header: 'HSD', width: 12, help: 'Hạn sử dụng, dạng dd/mm/yyyy.' },
  { key: 'note', header: 'Ghi chú', width: 22, help: 'Ghi chú; các dòng cùng phiếu được gộp vào diễn giải phiếu.' },
]

/** Chuẩn hoá để so khớp tên cột / tên NCC / tên NL: bỏ dấu, hạ chữ, gọn khoảng trắng. */
export function normalizeKey(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}
