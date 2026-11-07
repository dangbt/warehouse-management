import { Prisma } from '@prisma/client';

/**
 * Phân loại nhập/xuất + giá trị giao dịch kho dùng chung cho báo cáo NXT và Thẻ kho/Sổ chi tiết vật tư
 * (một nguồn sự thật để hai báo cáo luôn khớp số).
 *
 * Dấu SL: nhập (IMPORT, PROCESS_IN) = +|q|; xuất (EXPORT, ORDER_DEDUCT, PROCESS_OUT, RETURN) = −|q|
 * (các luồng cũ lưu dấu không đồng nhất nên lấy độ lớn); STOCKTAKE_ADJUST giữ nguyên dấu.
 * Giá trị: |total_cost| (giá vốn trên giao dịch, WMS-6); giao dịch cũ chưa có thì |total_price|, ngược lại |q| × COALESCE(unit_price, cost_per_unit).
 * Yêu cầu alias: `st` = stock_transactions, `i` = ingredients.
 */
/**
 * Chuyển kho (WMS-12): TRANSFER_IN = +|q|, TRANSFER_OUT = −|q|. Chỉ tính khi báo cáo lọc theo MỘT kho
 * (`includeTransfers = true`); toàn doanh nghiệp bỏ qua vì chuyển kho không làm đổi tổng nhập/xuất.
 */
export function signedQtySql(includeTransfers: boolean) {
  const transfers = includeTransfers
    ? Prisma.sql`WHEN st.type = 'TRANSFER_IN' THEN ABS(st.quantity)
  WHEN st.type = 'TRANSFER_OUT' THEN -ABS(st.quantity)`
    : Prisma.empty;
  return Prisma.sql`CASE
  WHEN st.type IN ('IMPORT', 'PROCESS_IN') THEN ABS(st.quantity)
  WHEN st.type IN ('EXPORT', 'ORDER_DEDUCT', 'PROCESS_OUT', 'RETURN') THEN -ABS(st.quantity)
  WHEN st.type = 'STOCKTAKE_ADJUST' THEN st.quantity
  ${transfers}
  ELSE 0
END`;
}

/** Biểu thức toàn doanh nghiệp (không tính chuyển kho). */
export const SIGNED_QTY_SQL = signedQtySql(false);

export const ABS_VALUE_SQL = Prisma.sql`COALESCE(ABS(st.total_cost), ABS(st.total_price), ABS(st.quantity) * COALESCE(st.unit_price, i.cost_per_unit))`;

/** Giá trị có dấu theo chiều của SL đã ký (`sq`, `av` là cột của CTE chứa hai biểu thức trên). */
export const SIGNED_VALUE_SQL = Prisma.sql`CASE WHEN sq < 0 THEN -av WHEN sq > 0 THEN av ELSE 0 END`;
