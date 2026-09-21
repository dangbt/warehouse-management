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

/** Kết quả tách thuế của một dòng bán hàng (đã làm tròn về đồng). */
export interface LineTax {
  /** Tiền hàng chưa thuế. */
  amountBeforeTax: number;
  /** Tiền thuế VAT. */
  vatAmount: number;
}

/**
 * Tách một dòng doanh thu (`lineGross` — tiền bán đã bao gồm/không gồm VAT) thành
 * tiền chưa thuế + tiền thuế VAT. Kết quả làm tròn về đồng (0 chữ số thập phân).
 *
 * - `pricesIncludeVat = true` (giá đã gồm VAT): `before = round(gross / (1 + p))`,
 *   `vat = gross − before` (đảm bảo `before + vat = round(gross)`).
 * - `pricesIncludeVat = false` (giá chưa gồm VAT): `before = round(gross)`,
 *   `vat = round(gross × p)`.
 *
 * `rate` null hoặc mã không chịu thuế (p = 0) ⇒ `vat = 0`, `before = round(gross)`.
 */
export function splitLineTax(args: { lineGross: number; rate: VatRate | null; pricesIncludeVat: boolean }): LineTax {
  const { lineGross, rate, pricesIncludeVat } = args;
  const p = rate == null ? 0 : vatRatePercent(rate) / 100;

  if (p === 0) {
    return { amountBeforeTax: roundVnd(lineGross), vatAmount: 0 };
  }

  if (pricesIncludeVat) {
    const gross = roundVnd(lineGross);
    const before = roundVnd(lineGross / (1 + p));
    return { amountBeforeTax: before, vatAmount: gross - before };
  }

  const before = roundVnd(lineGross);
  return { amountBeforeTax: before, vatAmount: roundVnd(lineGross * p) };
}

/**
 * Phân bổ tổng hoá đơn (`orderTotal`) về từng dòng theo tỷ lệ `lineGross`.
 *
 * Dùng khi tổng `Σ lineGross` (giá × số lượng) khác `order.totalAmount` do chiết khấu
 * cấp hoá đơn (hoặc làm tròn của KiotViet). Mỗi dòng nhận phần theo tỷ lệ `lineGross`,
 * làm tròn về đồng; dòng cuối nhận phần dư để `Σ` khớp đúng `orderTotal`.
 *
 * Trường hợp biên:
 * - Không có dòng nào ⇒ trả mảng rỗng.
 * - `Σ lineGross = 0` (mọi dòng bằng 0) ⇒ dồn toàn bộ `orderTotal` vào dòng cuối.
 */
export function allocateDiscount(lineGrosses: number[], orderTotal: number): number[] {
  const n = lineGrosses.length;
  if (n === 0) return [];

  const sum = lineGrosses.reduce((s, g) => s + g, 0);
  const target = roundVnd(orderTotal);

  if (sum === 0) {
    // Không có cơ sở phân bổ theo tỷ lệ ⇒ dồn tất cả vào dòng cuối.
    const result = new Array<number>(n).fill(0);
    result[n - 1] = target;
    return result;
  }

  const result: number[] = [];
  let running = 0;
  for (let i = 0; i < n; i++) {
    if (i === n - 1) {
      // Dòng cuối nhận phần dư để tổng khớp đúng target.
      result.push(target - running);
    } else {
      const share = roundVnd((lineGrosses[i] / sum) * target);
      result.push(share);
      running += share;
    }
  }
  return result;
}
