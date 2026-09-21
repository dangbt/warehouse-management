/**
 * VAT rate helpers cho API.
 *
 * `@wms/api` KHÔNG phụ thuộc `@wms/shared`, nên các hằng số/hàm thuế được tái tạo
 * ở đây (giữ cùng giá trị với `packages/shared/src/constants.ts`).
 */

export const VAT_RATES = ['0', '5', '8', '10', 'KCT', 'KKKNT'] as const;

export type VatRate = (typeof VAT_RATES)[number];

/**
 * Trả về phần trăm thuế suất VAT dưới dạng số.
 * Các mã không chịu thuế (`0`, `KCT`, `KKKNT`) trả về 0.
 */
export function vatRatePercent(rate: VatRate): number {
  switch (rate) {
    case '5':
      return 5;
    case '8':
      return 8;
    case '10':
      return 10;
    case '0':
    case 'KCT':
    case 'KKKNT':
    default:
      return 0;
  }
}

/** Làm tròn tiền thuế về đồng (0 chữ số thập phân). */
export function roundVnd(value: number): number {
  return Math.round(value);
}

/**
 * Tính tiền thuế VAT của một dòng (đã làm tròn về đồng).
 * `vatRate` null ⇒ 0. Áp dụng phần trăm thuế suất lên `totalPrice` (giá chưa thuế).
 */
export function computeLineVat(totalPrice: number, vatRate: VatRate | null): number {
  if (vatRate == null) return 0;
  return roundVnd((totalPrice * vatRatePercent(vatRate)) / 100);
}

export type TaxRegime = 'VAT_DEDUCTION' | 'HOUSEHOLD';

/**
 * Tính giá vốn đơn vị cho lô hàng nhập theo chế độ thuế.
 *
 * - `VAT_DEDUCTION`: VAT đầu vào được khấu trừ ⇒ giá vốn = giá chưa thuế (`unitPrice`).
 * - `HOUSEHOLD`: VAT không được khấu trừ ⇒ cộng VAT vào giá vốn
 *   (`unitPrice × (1 + vatRatePercent/100)`).
 *
 * `vatRate` null (phiếu không có hoá đơn/không thuế) ⇒ coi như 0% ⇒ giá vốn = `unitPrice`.
 *
 * @param unitPrice Giá chưa thuế theo đơn vị tồn.
 * @param vatRate   Mã thuế suất của dòng, hoặc null.
 * @param regime    Chế độ thuế hiện hành.
 * @returns Giá vốn đơn vị (chưa làm tròn — giữ nguyên độ chính xác để lưu Decimal).
 */
export function computeUnitCost(unitPrice: number, vatRate: VatRate | null, regime: TaxRegime): number {
  if (regime === 'HOUSEHOLD' && vatRate != null) {
    const withVat = unitPrice * (1 + vatRatePercent(vatRate) / 100);
    // Làm tròn về 2 chữ số thập phân (đơn vị tiền) để tránh sai số dấu phẩy động.
    return Math.round(withVat * 100) / 100;
  }
  return unitPrice;
}
