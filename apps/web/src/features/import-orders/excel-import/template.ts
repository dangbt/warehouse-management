import { VAT_RATES } from '@wms/shared'
import { IMPORT_COLUMNS, MAX_IMPORT_ROWS } from './columns'

export const TEMPLATE_DATA_SHEET = 'Nhập kho'
export const TEMPLATE_GUIDE_SHEET = 'Hướng dẫn'

/** Dòng ví dụ ở sheet dữ liệu (người dùng xoá đi khi nhập thật). */
const SAMPLE: (string | number)[] = ['07/11/2026', 'PN-0001', 'Công ty ABC (hoặc MST)', '0001234', 'C26TAA', '07/11/2026', 'Thịt bò', 10, 1, 250000, '8', '31/12/2026', 'Hàng mẫu']

/** Tạo file mẫu: sheet hướng dẫn + sheet dữ liệu (có danh sách chọn thuế suất). Trả về buffer .xlsx. */
export async function buildTemplateBuffer(): Promise<ArrayBuffer> {
  const { default: ExcelJS } = await import('exceljs')
  const wb = new ExcelJS.Workbook()

  const guide = wb.addWorksheet(TEMPLATE_GUIDE_SHEET)
  guide.columns = [{ width: 24 }, { width: 100 }]
  guide.addRow(['Hướng dẫn nhập phiếu nhập kho từ Excel']).font = { bold: true, size: 14 }
  guide.addRow([])
  const head = guide.addRow(['Cột', 'Mô tả'])
  head.font = { bold: true }
  for (const c of IMPORT_COLUMNS) guide.addRow([c.required ? `${c.header} (*)` : c.header, c.help])
  guide.addRow([])
  for (const t of [
    '(*) Cột bắt buộc. Nhập dữ liệu ở sheet "Nhập kho", bắt đầu từ dòng 2 (dòng 2 là ví dụ, hãy xoá).',
    'Nhiều dòng cùng Số CT = 1 phiếu (cùng NCC, ngày CT, số HĐ).',
    `Tối đa ${MAX_IMPORT_ROWS.toLocaleString('vi-VN')} dòng mỗi file. Phiếu tạo ra ở trạng thái Chờ duyệt.`,
    'Hệ thống kiểm tra từng dòng ở màn hình xem trước; còn dòng lỗi thì phải sửa hoặc bỏ dòng mới tạo được.',
  ]) guide.addRow([t])

  const sheet = wb.addWorksheet(TEMPLATE_DATA_SHEET)
  sheet.columns = IMPORT_COLUMNS.map((c) => ({ width: c.width }))
  const header = sheet.addRow(IMPORT_COLUMNS.map((c) => (c.required ? `${c.header}` : c.header)))
  header.font = { bold: true }
  header.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F0F0' } }
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
  })
  sheet.addRow(SAMPLE)
  sheet.views = [{ state: 'frozen', ySplit: 1 }]

  // Data validation cột Thuế suất.
  const vatCol = IMPORT_COLUMNS.findIndex((c) => c.key === 'vatRate') + 1
  for (let r = 2; r <= MAX_IMPORT_ROWS + 1; r++) {
    sheet.getCell(r, vatCol).dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae: [`"${VAT_RATES.join(',')}"`],
      showErrorMessage: true,
      errorTitle: 'Thuế suất không hợp lệ',
      error: `Chọn một trong: ${VAT_RATES.join(', ')}`,
    }
  }
  return (await wb.xlsx.writeBuffer()) as ArrayBuffer
}

/** Đọc file .xlsx → ma trận ô (dòng đầu là header) của sheet dữ liệu. */
export async function readWorkbookMatrix(file: File): Promise<unknown[][]> {
  const { default: ExcelJS } = await import('exceljs')
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.load(await file.arrayBuffer())
  const ws = wb.getWorksheet(TEMPLATE_DATA_SHEET) ?? wb.worksheets.find((s) => s.name !== TEMPLATE_GUIDE_SHEET) ?? wb.worksheets[0]
  if (!ws) return []
  const matrix: unknown[][] = []
  ws.eachRow({ includeEmpty: false }, (row) => {
    const values = (row.values as unknown[]).slice(1)
    matrix[row.number - 1] = values
  })
  // Lấp dòng trống để chỉ số dòng khớp số dòng Excel.
  return Array.from(matrix, (r) => r ?? [])
}

export function downloadBuffer(buf: ArrayBuffer, fileName: string) {
  const url = URL.createObjectURL(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }))
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
