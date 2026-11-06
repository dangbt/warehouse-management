import { BadRequestException } from '@nestjs/common';
import { validateBulkInput, BULK_MAX_ITEMS, type BulkImportInput } from './import-orders-bulk.service';

const item = { ingredient_id: 'i1', quantity: 2, unit_price: 1000 };
const order = { supplier_id: 's1', items: [item] };
const run = (b: BulkImportInput) => () => validateBulkInput(b);

describe('validateBulkInput', () => {
  it('chấp nhận lô hợp lệ', () => {
    expect(run({ orders: [order, { ...order, voucher_no: 'A1' }] })).not.toThrow();
  });

  it('từ chối lô rỗng', () => {
    expect(run({ orders: [] })).toThrow(BadRequestException);
  });

  it('từ chối quá giới hạn dòng', () => {
    const items = Array.from({ length: BULK_MAX_ITEMS + 1 }, () => item);
    expect(run({ orders: [{ supplier_id: 's1', items }] })).toThrow(/Tối đa/);
  });

  it('báo lỗi kèm số thứ tự phiếu', () => {
    const bad = { supplier_id: 's1', items: [{ ...item, quantity: -1 }] };
    expect(run({ orders: [order, bad] })).toThrow(/Phiếu #2/);
  });

  it('từ chối số chứng từ trùng trong file', () => {
    expect(run({ orders: [{ ...order, voucher_no: 'X' }, { ...order, voucher_no: 'X' }] })).toThrow(/trùng/);
  });

  it('có hoá đơn thì bắt buộc số HĐ, ngày HĐ, thuế suất hợp lệ', () => {
    const inv = { ...order, has_invoice: true, invoice_no: '1', invoice_date: '2026-01-02' };
    expect(run({ orders: [inv] })).toThrow(/Thuế suất/);
    expect(run({ orders: [{ ...inv, items: [{ ...item, vat_rate: '8' }] }] })).not.toThrow();
    expect(run({ orders: [{ ...inv, invoice_no: ' ', items: [{ ...item, vat_rate: '8' }] }] })).toThrow(/số hoá đơn/);
  });

  it('từ chối hoá đơn trùng trong file', () => {
    const inv = { ...order, has_invoice: true, invoice_no: '1', invoice_date: '2026-01-02', items: [{ ...item, vat_rate: '8' }] };
    expect(run({ orders: [inv, inv] })).toThrow(/Hoá đơn trùng/);
  });

  it('từ chối hệ số <= 0 và HSD sai', () => {
    expect(run({ orders: [{ ...order, items: [{ ...item, factor: 0 }] }] })).toThrow(/Hệ số/);
    expect(run({ orders: [{ ...order, items: [{ ...item, expiry_date: 'abc' }] }] })).toThrow(/Hạn sử dụng/);
  });
});
