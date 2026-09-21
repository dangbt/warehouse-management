import { BadRequestException } from '@nestjs/common';

/**
 * Kỳ kê khai thuế đã được phân giải thành khoảng thời gian tuyệt đối (UTC)
 * tương ứng với ranh giới ngày theo giờ Việt Nam (Asia/Ho_Chi_Minh = UTC+7,
 * không có DST).
 *
 * - `from`: 00:00:00.000 ngày đầu kỳ (giờ VN) quy về UTC.
 * - `to`:   23:59:59.999 ngày cuối kỳ (giờ VN) quy về UTC.
 * - `label`: nhãn hiển thị tiếng Việt, ví dụ "Tháng 09/2026" hoặc "Quý 3/2026".
 */
export interface Period {
  from: Date;
  to: Date;
  label: string;
}

/** Lệch giờ Việt Nam so với UTC, tính bằng mili-giây (UTC+7). */
const VN_OFFSET_MS = 7 * 60 * 60 * 1000;

/**
 * Tạo `Date` (UTC) từ các thành phần ngày/giờ hiểu theo giờ Việt Nam.
 * Ví dụ 2026-09-01 00:00 giờ VN ⇒ 2026-08-31T17:00:00.000Z.
 */
function vnDateToUtc(year: number, month: number, day: number, h: number, m: number, s: number, ms: number): Date {
  return new Date(Date.UTC(year, month, day, h, m, s, ms) - VN_OFFSET_MS);
}

/**
 * Phân giải chuỗi kỳ thuế thành khoảng thời gian.
 *
 * Định dạng hỗ trợ:
 * - Tháng: `YYYY-MM` (MM từ 01–12), ví dụ `2026-09`.
 * - Quý:   `YYYY-Qn` (n từ 1–4), ví dụ `2026-Q3`.
 *
 * Chuỗi sai định dạng hoặc giá trị ngoài phạm vi ⇒ ném `BadRequestException` (→ HTTP 400).
 */
export function parsePeriod(period: string | undefined): Period {
  if (!period || typeof period !== 'string') {
    throw new BadRequestException('Thiếu tham số kỳ (period)');
  }

  const monthMatch = /^(\d{4})-(\d{2})$/.exec(period);
  if (monthMatch) {
    const year = Number(monthMatch[1]);
    const month = Number(monthMatch[2]);
    if (month < 1 || month > 12) {
      throw new BadRequestException('Tháng không hợp lệ (01–12)');
    }
    const from = vnDateToUtc(year, month - 1, 1, 0, 0, 0, 0);
    // Ngày 0 của tháng kế = ngày cuối tháng hiện tại.
    const to = vnDateToUtc(year, month, 0, 23, 59, 59, 999);
    return { from, to, label: `Tháng ${String(month).padStart(2, '0')}/${year}` };
  }

  const quarterMatch = /^(\d{4})-Q([1-4])$/.exec(period);
  if (quarterMatch) {
    const year = Number(quarterMatch[1]);
    const quarter = Number(quarterMatch[2]);
    const startMonth = (quarter - 1) * 3; // chỉ số tháng 0-based
    const from = vnDateToUtc(year, startMonth, 1, 0, 0, 0, 0);
    const to = vnDateToUtc(year, startMonth + 3, 0, 23, 59, 59, 999);
    return { from, to, label: `Quý ${quarter}/${year}` };
  }

  throw new BadRequestException('Kỳ không hợp lệ. Định dạng: YYYY-MM hoặc YYYY-Qn');
}
