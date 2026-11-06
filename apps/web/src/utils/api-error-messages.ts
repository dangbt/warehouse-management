/** Thông báo tiếng Việt cho các error code do API trả về (API chỉ trả code, không hardcode câu VN). */
export const API_ERROR_MESSAGES: Record<string, string> = {
  PERIOD_LOCKED: 'Kỳ kho đã khoá sổ: không thể tạo/sửa/duyệt chứng từ có ngày chứng từ trong kỳ đã khoá. Hãy mở khoá sổ hoặc chọn ngày sau ngày khoá.',
  INVALID_LOCK_DATE: 'Ngày khoá sổ không hợp lệ',
  LOCK_DATE_IN_FUTURE: 'Không thể khoá sổ đến ngày trong tương lai',
  LOCK_DATE_NOT_AFTER_CURRENT: 'Ngày khoá mới phải sau ngày khoá hiện tại',
  REOPEN_DATE_NOT_BEFORE_CURRENT: 'Ngày khoá mới phải trước ngày khoá hiện tại',
  NOT_LOCKED: 'Kho chưa khoá sổ',
  IMPORT_UNPOST_NEGATIVE_STOCK: 'Không thể bỏ ghi: lô của phiếu đã được xuất một phần, bỏ ghi sẽ làm tồn kho âm.',
  IMPORT_UNPOST_HAS_RETURN: 'Không thể bỏ ghi: phiếu đã có phiếu trả hàng liên kết. Hãy xử lý phiếu trả hàng trước.',
}

/** Dịch error code → tiếng Việt; chuỗi khác (đã là thông báo) giữ nguyên. Cũng dịch phần sau "mã đơn: " của lỗi đồng bộ. */
export function translateApiMessage(message: string): string {
  if (API_ERROR_MESSAGES[message]) return API_ERROR_MESSAGES[message]
  return message.replace(/(^|: )([A-Z_]{4,})$/, (m, pre: string, code: string) => (API_ERROR_MESSAGES[code] ? `${pre}${API_ERROR_MESSAGES[code]}` : m))
}

/** Thông báo lỗi bỏ ghi: kèm danh sách NL thiếu / số phiếu trả hàng nếu API trả về. */
export function describeUnpostError(e: Error & { details?: { shortages?: { ingredientName: string; shortage: number }[]; returns?: string[] } }): string {
  const base = translateApiMessage(e.message)
  const shortages = e.details?.shortages
  if (shortages?.length) return `${base} Thiếu: ${shortages.map((s) => `${s.ingredientName} (${s.shortage})`).join(', ')}.`
  const returns = e.details?.returns
  if (returns?.length) return `${base} Phiếu trả: ${returns.join(', ')}.`
  return base
}
