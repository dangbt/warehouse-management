export type ImportOrderAction = 'approve' | 'reject' | 'unpost' | 'cancel'

/** Nội dung hộp xác nhận cho từng thao tác trên phiếu nhập. */
export function importOrderConfirmMessage(action: ImportOrderAction, code?: string): string {
  switch (action) {
    case 'approve':
      return `Duyệt phiếu ${code}?`
    case 'reject':
      return `Từ chối phiếu ${code}?`
    case 'unpost':
      return `Bỏ ghi phiếu ${code}? Tồn kho, lô, công nợ NCC và VAT đầu vào do phiếu sinh ra sẽ được đảo, phiếu về trạng thái Chờ duyệt để sửa.`
    case 'cancel':
      return `Huỷ phiếu ${code}? Phiếu vẫn hiển thị với trạng thái Đã huỷ.`
  }
}
