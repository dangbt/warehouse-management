import { EinvoiceService } from './einvoice.service';
import { SupplierItemMappingService } from './supplier-item-mapping.service';
import { buildInvoiceXml } from './einvoice.fixtures';
import { normalizeKey } from './item-key';

function setup(opts: { supplier?: { id: string; name: string; taxCode: string } | null; dup?: { code: string } | null }) {
  const prisma = {
    supplier: { findMany: jest.fn().mockResolvedValue(opts.supplier ? [opts.supplier] : []) },
    importOrder: { findFirst: jest.fn().mockResolvedValue(opts.dup ?? null) },
    supplierItemMapping: {
      findMany: jest.fn().mockResolvedValue([{ itemKey: normalizeKey('Thịt bò'), unitKey: 'kg', ingredientId: 'ing-1', factor: '1' }]),
      upsert: jest.fn((x) => x),
    },
    $transaction: jest.fn((ops) => Promise.all(ops)),
  };
  const mappings = new SupplierItemMappingService(prisma as never);
  return { prisma, mappings, svc: new EinvoiceService(prisma as never, mappings) };
}
const file = (name: string, xml: string) => ({ originalname: name, buffer: Buffer.from(xml) });

describe('EinvoiceService', () => {
  it('map NCC theo MST (bỏ định dạng) và áp mapping đã nhớ', async () => {
    const { svc } = setup({ supplier: { id: 's1', name: 'NCC A', taxCode: '0312345678' } });
    const [r] = await svc.parseUploads([file('a.xml', buildInvoiceXml())]);
    expect(r.supplier).toEqual({ id: 's1', name: 'NCC A' });
    expect(r.invoice!.lines[0].mapping).toEqual({ ingredientId: 'ing-1', factor: 1 });
    expect(r.invoice!.lines[1].mapping).toBeNull();
    expect(r.duplicateOf).toBeNull();
  });

  it('NCC chưa có ⇒ supplier null (đề xuất tạo mới), không tra mapping', async () => {
    const { svc, prisma } = setup({ supplier: null });
    const [r] = await svc.parseUploads([file('a.xml', buildInvoiceXml())]);
    expect(r.supplier).toBeNull();
    expect(prisma.supplierItemMapping.findMany).not.toHaveBeenCalled();
  });

  it('hoá đơn đã nhập (MST + ký hiệu + số) ⇒ báo trùng', async () => {
    const { svc, prisma } = setup({ supplier: { id: 's1', name: 'A', taxCode: '0312345678' }, dup: { code: 'PN-0001' } });
    const [r] = await svc.parseUploads([file('a.xml', buildInvoiceXml())]);
    expect(r.duplicateOf).toBe('PN-0001');
    expect(prisma.importOrder.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ supplierId: 's1', invoiceNo: '123', invoiceSymbol: 'C26TAA' }) }),
    );
  });

  it('trùng giữa 2 file trong cùng lần tải; file lỗi báo riêng, không hỏng cả lô', async () => {
    const { svc } = setup({ supplier: null });
    const res = await svc.parseUploads([file('a.xml', buildInvoiceXml()), file('b.xml', buildInvoiceXml()), file('c.xml', '<x/>')]);
    expect(res[0].duplicateOf).toBeNull();
    expect(res[1].duplicateOf).toBeTruthy();
    expect(res[2]).toMatchObject({ ok: false, error: { code: 'EINVOICE_INVALID_FORMAT' } });
  });

  it('lưu mapping theo khoá chuẩn hoá (upsert)', async () => {
    const { mappings, prisma } = setup({});
    await mappings.saveMany([{ supplier_id: 's1', item_name: '  Thịt  BÒ ', unit: 'KG', ingredient_id: 'i1', factor: 2 }]);
    expect(prisma.supplierItemMapping.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { supplierId_itemKey_unitKey: { supplierId: 's1', itemKey: 'thit bo', unitKey: 'kg' } } }),
    );
    await expect(mappings.saveMany([{ supplier_id: 's1', item_name: 'x', ingredient_id: 'i', factor: 0 }])).rejects.toThrow();
  });
});
