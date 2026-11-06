import { BadRequestException } from '@nestjs/common';
import { VAT_RATES, VatRate, computeLineVat } from '../tax/vat';
import type { ImportOrderItemInput } from './import-orders.service';

/** Kiểm tra từng dòng hàng của phiếu nhập; ném BadRequest nếu sai. */
export function assertValidItems(items: ImportOrderItemInput[], hasInvoice: boolean): void {
  for (const item of items) {
    if (!item.ingredient_id || !(item.quantity > 0) || !(item.unit_price >= 0)) throw new BadRequestException('Dữ liệu item không hợp lệ');
    if (item.factor != null && !(item.factor > 0)) throw new BadRequestException('Hệ số quy đổi đơn vị phải > 0');
    if (item.expiry_date && isNaN(new Date(item.expiry_date).getTime())) throw new BadRequestException('Hạn sử dụng không hợp lệ');
    if (hasInvoice && (!item.vat_rate || !(VAT_RATES as readonly string[]).includes(item.vat_rate))) {
      throw new BadRequestException('Thuế suất VAT không hợp lệ');
    }
  }
}

/** Quy đổi về đơn vị tồn (baseQty = quantity × factor) và tính tiền hàng + VAT từng dòng. */
export function buildOrderLines(items: ImportOrderItemInput[], hasInvoice: boolean) {
  return items.map((i) => {
    const baseQty = i.quantity * (i.factor ?? 1);
    const totalPrice = baseQty * i.unit_price;
    const vatRate: VatRate | null = hasInvoice ? (i.vat_rate as VatRate) : null;
    return {
      ingredientId: i.ingredient_id,
      quantity: baseQty,
      unitPrice: i.unit_price,
      totalPrice,
      vatRate,
      vatAmount: computeLineVat(totalPrice, vatRate),
      expiryDate: i.expiry_date ? new Date(i.expiry_date) : null,
    };
  });
}

export type OrderLines = ReturnType<typeof buildOrderLines>;

export function sumLines(lines: OrderLines) {
  const subtotal = lines.reduce((s, l) => s + l.totalPrice, 0);
  const vatAmount = lines.reduce((s, l) => s + l.vatAmount, 0);
  return { subtotal, vatAmount, totalAmount: subtotal + vatAmount };
}
