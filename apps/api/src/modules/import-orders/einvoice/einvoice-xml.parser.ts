import { XMLParser } from 'fast-xml-parser';
import { EinvoiceError, EINVOICE_MAX_FILE_BYTES, type EinvoiceLine, type ParsedEinvoice } from './einvoice.types';
import { buildTotals } from './einvoice-reconcile';

type Node = Record<string, unknown>;

// Không xử lý entity; DTD bị chặn từ trước khi parse nên không có XXE/billion laughs.
const parser = new XMLParser({
  ignoreAttributes: true,
  processEntities: false,
  htmlEntities: false,
  parseTagValue: false,
  trimValues: true,
  removeNSPrefix: true,
});

const asNode = (v: unknown): Node => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Node) : {});
const asArray = (v: unknown): unknown[] => (v == null || v === '' ? [] : Array.isArray(v) ? v : [v]);
const text = (n: Node, key: string): string => {
  const v = n[key];
  return typeof v === 'string' || typeof v === 'number' ? String(v).trim() : '';
};
/** Số kiểu XML (dấu chấm thập phân). Rỗng ⇒ 0; sai định dạng ⇒ lỗi. */
function num(n: Node, key: string, ctx: string): number {
  const s = text(n, key);
  if (!s) return 0;
  const v = Number(s);
  if (!Number.isFinite(v)) throw new EinvoiceError('EINVOICE_INVALID_FORMAT', `Giá trị số không hợp lệ ở ${ctx}/${key}: "${s}"`);
  return v;
}

/** "10%" → '10', "KCT" → 'KCT', "KKKNT" → 'KKKNT'. Không nhận ra ⇒ null. */
export function normalizeVatRate(raw: string): string | null {
  const s = raw.trim().toUpperCase().replace(/\s/g, '');
  if (s === 'KCT' || s === 'KKKNT') return s;
  const m = /^(\d+(?:[.,]\d+)?)%?$/.exec(s);
  if (!m) return null;
  const p = String(Number(m[1].replace(',', '.')));
  return ['0', '5', '8', '10'].includes(p) ? p : null;
}

function normalizeDate(raw: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw);
  if (!m || isNaN(new Date(`${m[1]}-${m[2]}-${m[3]}`).getTime())) throw new EinvoiceError('EINVOICE_INVALID_FORMAT', `Ngày hoá đơn không hợp lệ: "${raw}"`);
  return `${m[1]}-${m[2]}-${m[3]}`;
}

/** Chặn DTD/entity trước khi parse: hoá đơn TT78 hợp lệ không bao giờ có DOCTYPE. */
export function assertNoDtd(xml: string): void {
  if (/<!DOCTYPE|<!ENTITY|<!ELEMENT|<!ATTLIST/i.test(xml)) {
    throw new EinvoiceError('EINVOICE_DTD_FORBIDDEN', 'File XML chứa khai báo DTD/ENTITY nên bị từ chối vì lý do an toàn');
  }
}

/** Đọc 1 file XML hoá đơn điện tử theo TT78/2021 (HDon/DLHDon/NDHDon). */
export function parseEinvoiceXml(buf: Buffer): ParsedEinvoice {
  if (buf.length > EINVOICE_MAX_FILE_BYTES) throw new EinvoiceError('EINVOICE_FILE_TOO_LARGE', 'File vượt quá 5MB');
  const xml = buf.toString('utf8').replace(/^﻿/, '');
  assertNoDtd(xml);
  let root: Node;
  try {
    root = asNode(parser.parse(xml, true));
  } catch {
    throw new EinvoiceError('EINVOICE_INVALID_FORMAT', 'File không phải XML hợp lệ');
  }
  const dl = asNode(asNode(root.HDon).DLHDon);
  const chung = asNode(dl.TTChung);
  const nd = asNode(dl.NDHDon);
  const nban = asNode(nd.NBan);
  if (!Object.keys(dl).length || !Object.keys(nd).length) {
    throw new EinvoiceError('EINVOICE_INVALID_FORMAT', 'Không phải hoá đơn điện tử TT78 (thiếu HDon/DLHDon/NDHDon)');
  }
  const need = (v: string, label: string) => {
    if (!v) throw new EinvoiceError('EINVOICE_MISSING_FIELD', `Hoá đơn thiếu ${label}`);
    return v;
  };
  const symbol = need(text(chung, 'KHHDon'), 'ký hiệu hoá đơn (KHHDon)');
  const invoiceNo = need(text(chung, 'SHDon'), 'số hoá đơn (SHDon)');
  const invoiceDate = normalizeDate(need(text(chung, 'NLap'), 'ngày lập (NLap)'));
  const seller = {
    taxCode: need(text(nban, 'MST'), 'MST người bán').replace(/\s/g, ''),
    name: need(text(nban, 'Ten'), 'tên người bán'),
    address: text(nban, 'DChi'),
  };

  const items = asArray(asNode(nd.DSHHDVu).HHDVu).map(asNode);
  if (!items.length) throw new EinvoiceError('EINVOICE_INVALID_FORMAT', 'Hoá đơn không có dòng hàng (DSHHDVu)');
  const goods: (EinvoiceLine & { discountOnly?: boolean })[] = [];
  const discounts: { amount: number; vatRate: string | null }[] = [];
  const unknownRates: string[] = [];
  items.forEach((it, idx) => {
    const ctx = `HHDVu[${idx + 1}]`;
    const tchat = text(it, 'TChat');
    if (tchat === '4') return; // dòng ghi chú
    const rawRate = text(it, 'TSuat');
    const rate = normalizeVatRate(rawRate);
    if (rawRate && !rate) unknownRates.push(rawRate);
    const amount = num(it, 'ThTien', ctx);
    const stt = Number(text(it, 'STT')) || idx + 1;
    if (tchat === '3') {
      // Chiết khấu thương mại: số tiền có thể ghi dương hoặc âm.
      discounts.push({ amount: Math.abs(amount), vatRate: rate });
      return;
    }
    const quantity = num(it, 'SLuong', ctx);
    goods.push({
      stt,
      name: need(text(it, 'THHDVu'), `tên hàng dòng ${stt}`),
      unit: text(it, 'DVTinh'),
      quantity: quantity || 1,
      unitPrice: num(it, 'DGia', ctx) || amount / (quantity || 1),
      amount,
      vatRate: rate ?? '0',
      vatAmount: 0,
      discountAllocated: 0,
    });
  });
  if (!goods.length) throw new EinvoiceError('EINVOICE_INVALID_FORMAT', 'Hoá đơn không có dòng hàng hoá/dịch vụ');

  const tt = asNode(nd.TToan);
  const declared = {
    subtotal: num(tt, 'TgTCThue', 'TToan'),
    vatAmount: num(tt, 'TgTThue', 'TToan'),
    total: num(tt, 'TgTTTBSo', 'TToan'),
  };
  const declaredByRate = asArray(asNode(tt.THTTLTSuat).LTSuat).map((x) => {
    const n = asNode(x);
    return { rate: normalizeVatRate(text(n, 'TSuat')), amount: num(n, 'ThTien', 'LTSuat'), vat: num(n, 'TThue', 'LTSuat') };
  });
  const { lines, computed, warnings } = buildTotals({ goods, discounts, declared, declaredByRate, unknownRates });
  return { template: text(chung, 'KHMSHDon'), symbol, invoiceNo, invoiceDate, seller, lines, declared, computed, warnings };
}
