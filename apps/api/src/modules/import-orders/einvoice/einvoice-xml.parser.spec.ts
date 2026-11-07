import { parseEinvoiceXml, normalizeVatRate } from './einvoice-xml.parser';
import { collectXmlSources } from './einvoice-files';
import { buildInvoiceXml } from './einvoice.fixtures';
import JSZip from 'jszip';

const parse = (xml: string) => parseEinvoiceXml(Buffer.from(xml, 'utf8'));
const codeOf = (fn: () => unknown) => {
  try {
    fn();
  } catch (e) {
    return (e as { errorCode?: string }).errorCode;
  }
  return undefined;
};

describe('parseEinvoiceXml (TT78)', () => {
  it('đọc thông tin chung, người bán và các dòng hàng', () => {
    const inv = parse(buildInvoiceXml());
    expect(inv).toMatchObject({ symbol: 'C26TAA', invoiceNo: '123', invoiceDate: '2026-10-15', template: '1' });
    expect(inv.seller).toEqual({ taxCode: '0312345678', name: 'Công ty TNHH Thực phẩm Sạch', address: '12 Lê Lợi, Quận 1, TP.HCM' });
    expect(inv.lines.map((l) => [l.name, l.unit, l.quantity, l.vatRate])).toEqual([
      ['Thịt bò', 'kg', 10, '8'],
      ['Rau muống', 'kg', 20, '5'],
    ]);
  });

  it('nhiều thuế suất + dòng chiết khấu: phân bổ vào đúng thuế suất, tổng khớp hoá đơn', () => {
    const inv = parse(buildInvoiceXml());
    const [beef, veg] = inv.lines;
    expect(beef.discountAllocated).toBe(100000);
    expect(beef.amount).toBe(1900000);
    expect(beef.vatAmount).toBe(152000);
    expect(beef.unitPrice).toBe(190000);
    expect(veg.vatAmount).toBe(30000);
    expect(inv.computed).toEqual({ subtotal: 2500000, vatAmount: 182000, total: 2682000 });
    expect(inv.warnings).toEqual([]);
  });

  it('tổng trên hoá đơn lệch tổng tính lại ⇒ cảnh báo, không chặn', () => {
    const inv = parse(buildInvoiceXml({ total: 2682050, vat: 182050 }));
    expect(inv.warnings.map((w) => w.code).sort()).toEqual(['TOTAL_MISMATCH', 'VAT_MISMATCH']);
  });

  it('thuế suất lạ ⇒ cảnh báo và tạm tính 0%', () => {
    const inv = parse(
      buildInvoiceXml({
        items: [{ stt: 1, name: 'Gạo', unit: 'kg', qty: 1, price: 100, amount: 100, rate: 'abc' }],
        subtotal: 100,
        vat: 0,
        total: 100,
      }),
    );
    expect(inv.lines[0].vatRate).toBe('0');
    expect(inv.warnings.map((w) => w.code)).toContain('UNKNOWN_VAT_RATE');
  });

  it('chuẩn hoá thuế suất', () => {
    expect(['10%', '8', 'KCT', 'kkknt', '7%', ''].map(normalizeVatRate)).toEqual(['10', '8', 'KCT', 'KKKNT', null, null]);
  });
});

describe('an toàn / lỗi định dạng', () => {
  it('chặn DTD và entity ngoài (XXE)', () => {
    const xxe = buildInvoiceXml({ prolog: '<?xml version="1.0"?><!DOCTYPE HDon [<!ENTITY x SYSTEM "file:///etc/passwd">]>' });
    expect(codeOf(() => parse(xxe))).toBe('EINVOICE_DTD_FORBIDDEN');
  });

  it('file > 5MB ⇒ EINVOICE_FILE_TOO_LARGE', () => {
    expect(codeOf(() => parseEinvoiceXml(Buffer.alloc(5 * 1024 * 1024 + 1, 'a')))).toBe('EINVOICE_FILE_TOO_LARGE');
  });

  it('không phải XML TT78 ⇒ EINVOICE_INVALID_FORMAT', () => {
    expect(codeOf(() => parse('<foo><bar/></foo>'))).toBe('EINVOICE_INVALID_FORMAT');
    expect(codeOf(() => parse('đây không phải xml'))).toBe('EINVOICE_INVALID_FORMAT');
  });

  it('thiếu MST người bán ⇒ EINVOICE_MISSING_FIELD', () => {
    expect(codeOf(() => parse(buildInvoiceXml({ taxCode: '' })))).toBe('EINVOICE_MISSING_FIELD');
  });
});

describe('collectXmlSources', () => {
  const blob = (originalname: string, buffer: Buffer) => ({ originalname, buffer });
  const rejects = async (p: Promise<unknown>) =>
    (
      (await p.then(
        () => null,
        (e) => e,
      )) as { errorCode?: string } | null
    )?.errorCode;

  it('đọc .xml và .zip chứa nhiều .xml', async () => {
    const zip = new JSZip();
    zip.file('a.xml', buildInvoiceXml({ no: '1' }));
    zip.file('sub/b.xml', buildInvoiceXml({ no: '2' }));
    zip.file('readme.txt', 'x');
    const zbuf = await zip.generateAsync({ type: 'nodebuffer' });
    const out = await collectXmlSources([blob('c.xml', Buffer.from(buildInvoiceXml())), blob('d.zip', zbuf)]);
    expect(out.map((o) => o.fileName)).toEqual(['c.xml', 'd.zip/a.xml', 'd.zip/sub/b.xml']);
  });

  it('báo mã lỗi: không file / định dạng lạ / zip hỏng / quá 5MB', async () => {
    expect(await rejects(collectXmlSources([]))).toBe('EINVOICE_NO_FILES');
    expect(await rejects(collectXmlSources([blob('a.pdf', Buffer.from('x'))]))).toBe('EINVOICE_UNSUPPORTED_FILE');
    expect(await rejects(collectXmlSources([blob('a.zip', Buffer.from('not a zip'))]))).toBe('EINVOICE_ZIP_INVALID');
    expect(await rejects(collectXmlSources([blob('a.xml', Buffer.alloc(5 * 1024 * 1024 + 1))]))).toBe('EINVOICE_FILE_TOO_LARGE');
  });
});
