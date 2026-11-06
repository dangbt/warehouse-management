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
    expect(
      run({
        orders: [
          { ...order, voucher_no: 'X' },
          { ...order, voucher_no: 'X' },
        ],
      }),
    ).toThrow(/trùng/);
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

import { ImportOrdersBulkService, assertDecimalRange } from './import-orders-bulk.service';

describe('assertDecimalRange', () => {
  const ok = { quantity: 1, unitPrice: 1, totalPrice: 1, vatAmount: 0 };
  it('chặn số vượt Decimal bằng lỗi rõ ràng', () => {
    expect(() => assertDecimalRange([ok], 0)).not.toThrow();
    expect(() => assertDecimalRange([{ ...ok, quantity: 1e7 }], 2)).toThrow(/Phiếu #3.*vượt giới hạn/);
  });
});

describe('bulkCreate', () => {
  const sup = { id: 's1', address: ' 1 Lê Lợi ' };
  const mk = (txImpl: (cb: any, opts: any) => any, dupInvoice = false) => {
    const tx = {
      importOrder: {
        findMany: jest.fn().mockResolvedValue(dupInvoice ? [{ code: 'PN-9', supplierId: 's1', invoiceSymbol: null, invoiceNo: 'A1' }] : []),
        createMany: jest.fn(),
      },
      importOrderItem: { createMany: jest.fn() },
    };
    const prisma: any = {
      supplier: { findMany: jest.fn().mockResolvedValue([sup]) },
      ingredient: { findMany: jest.fn().mockResolvedValue([{ id: 'i1' }]) },
      $transaction: jest.fn((cb, opts) => txImpl(() => cb(tx), opts)),
    };
    const vouchers: any = {
      hasNo: jest.fn().mockResolvedValue(false),
      nextNos: jest.fn().mockResolvedValue(['PN00001', 'PN00002', 'PN00003']),
      rethrowUnique: jest.fn((e) => {
        throw e;
      }),
    };
    return { svc: new ImportOrdersBulkService(prisma, vouchers), tx, prisma };
  };
  const item = { ingredient_id: 'i1', quantity: 2, unit_price: 1000 };

  it('tạo bằng createMany, timeout dài, số tự cấp tránh số nhập tay, lấy địa chỉ NCC', async () => {
    const { svc, tx, prisma } = mk((run) => run());
    const r = await svc.bulkCreate('u1', {
      orders: [
        { supplier_id: 's1', items: [item] },
        { supplier_id: 's1', voucher_no: 'PN00001', items: [item] },
      ],
    });
    expect(r.created).toBe(2);
    expect(prisma.$transaction.mock.calls[0][1].timeout).toBeGreaterThan(5000);
    expect(tx.importOrder.createMany).toHaveBeenCalledTimes(1);
    const data = tx.importOrder.createMany.mock.calls[0][0].data;
    expect(data.map((d: any) => d.voucherNo)).toEqual(['PN00002', 'PN00001']);
    expect(data[0].purchaseAddress).toBe('1 Lê Lợi');
  });

  it('trùng hoá đơn với DB → 400, không createMany', async () => {
    const { svc, tx } = mk((run) => run(), true);
    const o = { supplier_id: 's1', has_invoice: true, invoice_no: 'A1', invoice_date: '2026-11-01', items: [{ ...item, vat_rate: '8' }] };
    await expect(svc.bulkCreate('u1', { orders: [o] })).rejects.toThrow(/PN-9/);
    expect(tx.importOrder.createMany).not.toHaveBeenCalled();
  });

  it('hết hạn transaction (P2028) → 503 thông báo rõ', async () => {
    const { svc } = mk(() => Promise.reject(Object.assign(new Error('tx'), { code: 'P2028' })));
    await expect(svc.bulkCreate('u1', { orders: [{ supplier_id: 's1', items: [item] }] })).rejects.toThrow(/quá thời gian/);
  });
});
