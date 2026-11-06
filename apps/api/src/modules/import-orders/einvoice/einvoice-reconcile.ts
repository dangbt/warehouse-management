import { computeLineVat, roundVnd, type VatRate } from '../../tax/vat';
import type { EinvoiceLine, EinvoiceTotals, EinvoiceWarning } from './einvoice.types';

const r2 = (n: number) => Math.round(n * 100) / 100;
/** Lệch ≤ 0,5đ coi như khớp (sai số số thực). */
const EPS = 0.5;

interface Input {
  goods: EinvoiceLine[];
  discounts: { amount: number; vatRate: string | null }[];
  declared: EinvoiceTotals;
  declaredByRate: { rate: string | null; amount: number; vat: number }[];
  unknownRates: string[];
}

/** Phân bổ chiết khấu thương mại vào các dòng hàng cùng thuế suất (không có thì vào tất cả), tỉ lệ theo thành tiền. */
function allocateDiscount(goods: EinvoiceLine[], d: { amount: number; vatRate: string | null }): boolean {
  if (!(d.amount > 0)) return true;
  let targets = d.vatRate ? goods.filter((g) => g.vatRate === d.vatRate) : [];
  if (!targets.length) targets = goods;
  const base = targets.reduce((s, g) => s + g.amount, 0);
  if (!(base > 0)) return false;
  let left = d.amount;
  targets.forEach((g, i) => {
    const part = i === targets.length - 1 ? left : r2((d.amount * g.amount) / base);
    g.amount = r2(g.amount - part);
    g.discountAllocated = r2(g.discountAllocated + part);
    left = r2(left - part);
  });
  return true;
}

/** Áp chiết khấu, tính VAT từng dòng, tổng tính lại và đối chiếu với tổng ghi trên hoá đơn. */
export function buildTotals(input: Input): { lines: EinvoiceLine[]; computed: EinvoiceTotals; warnings: EinvoiceWarning[] } {
  const { goods, discounts, declared, declaredByRate, unknownRates } = input;
  const warnings: EinvoiceWarning[] = [];
  for (const d of discounts) {
    if (!allocateDiscount(goods, d)) {
      warnings.push({ code: 'DISCOUNT_UNALLOCATED', message: `Không phân bổ được dòng chiết khấu ${d.amount} vào hàng hoá` });
    }
  }
  for (const g of goods) {
    g.vatAmount = computeLineVat(g.amount, g.vatRate as VatRate);
    if (g.quantity > 0) g.unitPrice = r2(g.amount / g.quantity);
  }
  const subtotal = r2(goods.reduce((s, g) => s + g.amount, 0));
  const vatAmount = r2(goods.reduce((s, g) => s + g.vatAmount, 0));
  const computed = { subtotal, vatAmount, total: r2(subtotal + vatAmount) };

  for (const raw of [...new Set(unknownRates)]) {
    warnings.push({ code: 'UNKNOWN_VAT_RATE', message: `Thuế suất "${raw}" không nhận dạng được, tạm tính 0%` });
  }
  const check = (code: EinvoiceWarning['code'], label: string, dec: number, com: number) => {
    if (dec > 0 && Math.abs(dec - com) > EPS) {
      warnings.push({ code, message: `${label} trên hoá đơn ${dec} lệch tính lại ${com} (chênh ${r2(dec - com)}), có thể do làm tròn` });
    }
  };
  check('SUBTOTAL_MISMATCH', 'Tiền hàng', declared.subtotal, subtotal);
  check('VAT_MISMATCH', 'Tiền thuế', declared.vatAmount, vatAmount);
  check('TOTAL_MISMATCH', 'Tổng thanh toán', declared.total, computed.total);
  for (const dr of declaredByRate) {
    if (!dr.rate) continue;
    const vat = goods.filter((g) => g.vatRate === dr.rate).reduce((s, g) => s + g.vatAmount, 0);
    if (dr.vat > 0 && Math.abs(roundVnd(vat) - dr.vat) > EPS) {
      warnings.push({ code: 'VAT_MISMATCH', message: `Thuế suất ${dr.rate}%: thuế trên hoá đơn ${dr.vat} lệch tính lại ${roundVnd(vat)}` });
    }
  }
  return { lines: goods, computed, warnings };
}
