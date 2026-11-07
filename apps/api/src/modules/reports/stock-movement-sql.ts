import { Prisma } from '@prisma/client';

/**
 * Phân loại nhập/xuất + giá trị giao dịch kho dùng chung cho báo cáo NXT và Thẻ kho/Sổ chi tiết vật tư
 * (một nguồn sự thật để hai báo cáo luôn khớp số).
 *
 * Dấu SL: nhập (IMPORT, PROCESS_IN) = +|q|; xuất (EXPORT, ORDER_DEDUCT, PROCESS_OUT, RETURN) = −|q|
 * (các luồng cũ lưu dấu không đồng nhất nên lấy độ lớn); STOCKTAKE_ADJUST giữ nguyên dấu.
 * Giá trị: |total_price| nếu có, ngược lại |q| × COALESCE(unit_price, cost_per_unit).
 * Yêu cầu alias: `st` = stock_transactions, `i` = ingredients.
 */
export const SIGNED_QTY_SQL = Prisma.sql`CASE
  WHEN st.type IN ('IMPORT', 'PROCESS_IN') THEN ABS(st.quantity)
  WHEN st.type IN ('EXPORT', 'ORDER_DEDUCT', 'PROCESS_OUT', 'RETURN') THEN -ABS(st.quantity)
  WHEN st.type = 'STOCKTAKE_ADJUST' THEN st.quantity
  ELSE 0
END`;

export const ABS_VALUE_SQL = Prisma.sql`COALESCE(ABS(st.total_price), ABS(st.quantity) * COALESCE(st.unit_price, i.cost_per_unit))`;

/** Giá trị có dấu theo chiều của SL đã ký (`sq`, `av` là cột của CTE chứa hai biểu thức trên). */
export const SIGNED_VALUE_SQL = Prisma.sql`CASE WHEN sq < 0 THEN -av WHEN sq > 0 THEN av ELSE 0 END`;
