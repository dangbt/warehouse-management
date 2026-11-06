/**
 * Tiện ích xuất Excel dùng chung cho các báo cáo thuế.
 *
 * `exceljs` được nạp động (`await import`) để không phình gói chính (main chunk) —
 * chỉ tải khi người dùng thực sự bấm "Xuất Excel".
 */

export interface ExcelColumn {
  /** Tiêu đề cột hiển thị trên header. */
  header: string;
  /** Độ rộng cột (đơn vị của exceljs, xấp xỉ số ký tự). */
  width?: number;
  /** Căn lề ô dữ liệu. */
  align?: 'left' | 'center' | 'right';
}

export interface ExportSheetOptions {
  /** Tên file tải về (đã kèm hoặc chưa kèm `.xlsx` đều được). */
  fileName: string;
  /** Tiêu đề lớn ở dòng đầu (in đậm). */
  title: string;
  /** Các dòng chú thích phía trên bảng (tên/MST người nộp thuế, kỳ...). */
  headerLines?: string[];
  /** Định nghĩa cột. */
  columns: ExcelColumn[];
  /** Dữ liệu: mảng các dòng, mỗi dòng là mảng ô theo thứ tự cột. */
  rows: (string | number | null)[][];
  /** Dòng cộng cuối (in đậm), theo thứ tự cột. */
  totalRow?: (string | number | null)[];
}

/**
 * Tạo và tải về một file Excel một sheet: tiêu đề, các dòng chú thích, header cột,
 * dữ liệu và (tuỳ chọn) dòng cộng.
 */
export async function exportSheet(options: ExportSheetOptions): Promise<void> {
  const { default: ExcelJS } = await import('exceljs');
  const { fileName, title, headerLines = [], columns, rows, totalRow } = options;

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Bảng kê');

  const colCount = columns.length;
  const lastCol = colCount > 0 ? columns.length : 1;

  // Tiêu đề — trộn ô suốt chiều rộng bảng.
  const titleRow = sheet.addRow([title]);
  titleRow.font = { bold: true, size: 14 };
  if (colCount > 1) sheet.mergeCells(1, 1, 1, lastCol);

  // Các dòng chú thích.
  for (const line of headerLines) {
    const r = sheet.addRow([line]);
    if (colCount > 1) sheet.mergeCells(r.number, 1, r.number, lastCol);
  }

  // Dòng trống ngăn cách.
  sheet.addRow([]);

  // Header cột.
  const headerRow = sheet.addRow(columns.map((c) => c.header));
  headerRow.font = { bold: true };
  headerRow.eachCell((cell) => {
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' },
    };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F0F0' } };
  });

  // Độ rộng + căn lề cột.
  columns.forEach((col, i) => {
    const column = sheet.getColumn(i + 1);
    if (col.width) column.width = col.width;
  });

  // Dữ liệu.
  for (const row of rows) {
    const r = sheet.addRow(row);
    r.eachCell((cell, colNumber) => {
      const align = columns[colNumber - 1]?.align ?? 'left';
      cell.alignment = { horizontal: align, vertical: 'middle' };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
    });
  }

  // Dòng cộng.
  if (totalRow) {
    const r = sheet.addRow(totalRow);
    r.font = { bold: true };
    r.eachCell((cell, colNumber) => {
      const align = columns[colNumber - 1]?.align ?? 'left';
      cell.alignment = { horizontal: align, vertical: 'middle' };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName.endsWith('.xlsx') ? fileName : `${fileName}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** Một sheet trong file Excel nhiều sheet. */
export interface ExcelSheet {
  /** Tên sheet (tối đa 31 ký tự, không chứa ký tự đặc biệt của Excel). */
  name: string;
  /** Tiêu đề lớn ở dòng đầu (in đậm). */
  title: string;
  /** Các dòng chú thích phía trên bảng. */
  headerLines?: string[];
  /** Định nghĩa cột. */
  columns: ExcelColumn[];
  /** Dữ liệu: mảng các dòng, mỗi dòng là mảng ô theo thứ tự cột. */
  rows: (string | number | null)[][];
  /** Dòng cộng cuối (in đậm), theo thứ tự cột. */
  totalRow?: (string | number | null)[];
}

export interface ExportMultiSheetOptions {
  /** Tên file tải về. */
  fileName: string;
  /** Danh sách sheet. */
  sheets: ExcelSheet[];
}

/** Đảm bảo tên sheet hợp lệ và không trùng trong workbook. */
function safeSheetName(raw: string, used: Set<string>): string {
  let base = (raw || 'Sheet').replace(/[\\/*?:[\]]/g, ' ').slice(0, 31) || 'Sheet';
  let name = base;
  let i = 1;
  while (used.has(name.toLowerCase())) {
    const suffix = ` (${i++})`;
    base = base.slice(0, 31 - suffix.length);
    name = `${base}${suffix}`;
  }
  used.add(name.toLowerCase());
  return name;
}

/**
 * Tạo và tải về một file Excel nhiều sheet — mỗi sheet dựng theo cùng bố cục của
 * `exportSheet` (tiêu đề, chú thích, header cột, dữ liệu, dòng cộng tuỳ chọn).
 */
export async function exportMultiSheet(options: ExportMultiSheetOptions): Promise<void> {
  const { default: ExcelJS } = await import('exceljs');
  const { fileName, sheets } = options;

  const workbook = new ExcelJS.Workbook();
  const usedNames = new Set<string>();

  for (const spec of sheets) {
    const { title, headerLines = [], columns, rows, totalRow } = spec;
    const sheet = workbook.addWorksheet(safeSheetName(spec.name, usedNames));

    const colCount = columns.length;
    const lastCol = colCount > 0 ? columns.length : 1;

    const titleRow = sheet.addRow([title]);
    titleRow.font = { bold: true, size: 14 };
    if (colCount > 1) sheet.mergeCells(1, 1, 1, lastCol);

    for (const line of headerLines) {
      const r = sheet.addRow([line]);
      if (colCount > 1) sheet.mergeCells(r.number, 1, r.number, lastCol);
    }

    sheet.addRow([]);

    const headerRow = sheet.addRow(columns.map((c) => c.header));
    headerRow.font = { bold: true };
    headerRow.eachCell((cell) => {
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F0F0' } };
    });

    columns.forEach((col, i) => {
      const column = sheet.getColumn(i + 1);
      if (col.width) column.width = col.width;
    });

    for (const row of rows) {
      const r = sheet.addRow(row);
      r.eachCell((cell, colNumber) => {
        const align = columns[colNumber - 1]?.align ?? 'left';
        cell.alignment = { horizontal: align, vertical: 'middle' };
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
      });
    }

    if (totalRow) {
      const r = sheet.addRow(totalRow);
      r.font = { bold: true };
      r.eachCell((cell, colNumber) => {
        const align = columns[colNumber - 1]?.align ?? 'left';
        cell.alignment = { horizontal: align, vertical: 'middle' };
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
      });
    }
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName.endsWith('.xlsx') ? fileName : `${fileName}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
