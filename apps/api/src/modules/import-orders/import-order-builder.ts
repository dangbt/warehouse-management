import { BadRequestException } from '@nestjs/common';
import { VAT_RATES, VatRate, computeLineVat } from '../tax/vat';
import { parseVoucherDate } from '../common/voucher.service';
import type { CreateImportOrderInput } from './import-orders.service';

export interface ImportInvoiceInfo {
  hasInvoice: boolean;
  invoiceNo: string | null;
  invoiceSymbol: string | null;
  invoiceDate: Date | null;
}

/** Kiểm tra + chuẩn hoá thông tin hoá đơn của phiếu nhập. */
export function parseInvoice(body: CreateImportOrderInput): ImportInvoiceInfo {
  const hasInvoice = body.has_invoice ?? false;
  if (!hasInvoice) return { hasInvoice, invoiceNo: null, invoiceSymbol: null, invoiceDate: null };
  if (!body.invoice_no?.trim()) throw new BadRequestException('Thiếu số hoá đơn');
  if (!body.invoice_date) throw new BadRequestException('Thiếu ngày hoá đơn');
  const invoiceDate = new Date(body.invoice_date);
  if (isNaN(invoiceDate.getTime())) throw new BadRequestException('Ngày hoá đơn không hợp lệ');
  return { hasInvoice, invoiceNo: body.invoice_no.trim(), invoiceSymbol: body.invoice_symbol?.trim() || null, invoiceDate };
}

/** Kiểm tra dòng hàng và quy đổi về đơn vị tồn: baseQty = quantity × factor. */
export function buildLines(body: CreateImportOrderInput, hasInvoice: boolean) {
  for (const item of body.items) {
    if (!item.ingredient_id || item.quantity <= 0 || item.unit_price < 0) throw new BadRequestException('Dữ liệu item không hợp lệ');
    if (item.factor != null && item.factor <= 0) throw new BadRequestException('Hệ số quy đổi đơn vị phải > 0');
    if (hasInvoice && (!item.vat_rate || !(VAT_RATES as readonly string[]).includes(item.vat_rate))) {
      throw new BadRequestException('Thuế suất VAT không hợp lệ');
    }
  }
  const lines = body.items.map((i) => {
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
  const subtotal = lines.reduce((s, l) => s + l.totalPrice, 0);
  const vatAmount = lines.reduce((s, l) => s + l.vatAmount, 0);
  return { lines, subtotal, vatAmount, totalAmount: subtotal + vatAmount };
}

export { parseVoucherDate };
