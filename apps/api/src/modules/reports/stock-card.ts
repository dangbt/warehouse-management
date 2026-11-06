/**
 * Thẻ kho (S12-DN) / Sổ chi tiết vật tư (S10-DN) của 1 nguyên liệu: kiểu dữ liệu + hàm thuần dựng sổ
 * từ tồn đầu kỳ và các giao dịch trong kỳ (đã sắp theo ngày chứng từ). Query DB: stock-card.repository.ts.
 */

export type StockDocType = 'IMPORT_ORDER' | 'STOCK_EXPORT' | 'PURCHASE_RETURN' | 'STOCKTAKE' | 'PROCESSING';

/** Giao dịch thô từ SQL: qty/value có dấu (nhập > 0, xuất < 0). */
export interface StockCardRawTx {
  id: string;
  voucherDate: Date;
  type: string;
  qty: number;
  value: number;
  voucherNo: string | null;
  docType: StockDocType | null;
  docId: string | null;
  note: string | null;
}

export interface StockCardOpening {
  qty: number;
  value: number;
}

export interface StockCardLine {
  id: string;
  voucherDate: string;
  voucherNo: string | null;
  docType: StockDocType | null;
  docId: string | null;
  type: string;
  description: string;
  inQty: number;
  outQty: number;
  balanceQty: number;
  /** Đơn giá bình quân của dòng = giá trị / SL (0 nếu SL = 0). */
  unitPrice: number;
  inValue: number;
  outValue: number;
  balanceValue: number;
}

export interface StockCardTotals {
  inQty: number;
  outQty: number;
  inValue: number;
  outValue: number;
}

export interface StockCard {
  ingredient: { id: string; code: string; name: string; unit: string };
  from: string;
  to: string;
  opening: StockCardOpening;
  lines: StockCardLine[];
  totals: StockCardTotals;
  closing: StockCardOpening;
}

const r3 = (n: number) => Math.round(n * 1000) / 1000;
const r2 = (n: number) => Math.round(n * 100) / 100;

const TYPE_LABEL: Record<string, string> = {
  IMPORT: 'Nhập kho',
  EXPORT: 'Xuất kho',
  ORDER_DEDUCT: 'Trừ kho theo đơn bán',
  PROCESS_IN: 'Nhập từ chế biến',
  PROCESS_OUT: 'Xuất chế biến',
  RETURN: 'Trả hàng NCC',
  STOCKTAKE_ADJUST: 'Điều chỉnh kiểm kê',
};

export function describeTx(type: string, note: string | null): string {
  const label = TYPE_LABEL[type] ?? type;
  return note ? `${label} — ${note}` : label;
}

/** Dựng thẻ kho: tồn lũy kế = đầu kỳ + Σ(nhập − xuất); tồn cuối kỳ khớp cột cuối kỳ của báo cáo NXT. */
export function buildStockCard(
  ingredient: StockCard['ingredient'],
  opening: StockCardOpening,
  txs: StockCardRawTx[],
  from: string,
  to: string,
): StockCard {
  let balQty = opening.qty;
  let balVal = opening.value;
  const totals: StockCardTotals = { inQty: 0, outQty: 0, inValue: 0, outValue: 0 };
  const lines: StockCardLine[] = txs.map((t) => {
    const isIn = t.qty > 0;
    const q = Math.abs(t.qty);
    const v = Math.abs(t.value);
    balQty += t.qty;
    balVal += t.value;
    if (isIn) {
      totals.inQty += q;
      totals.inValue += v;
    } else {
      totals.outQty += q;
      totals.outValue += v;
    }
    return {
      id: t.id,
      voucherDate: t.voucherDate.toISOString(),
      voucherNo: t.voucherNo,
      docType: t.docType,
      docId: t.docId,
      type: t.type,
      description: describeTx(t.type, t.note),
      inQty: isIn ? r3(q) : 0,
      outQty: isIn ? 0 : r3(q),
      balanceQty: r3(balQty),
      unitPrice: q === 0 ? 0 : r2(v / q),
      inValue: isIn ? r2(v) : 0,
      outValue: isIn ? 0 : r2(v),
      balanceValue: r2(balVal),
    };
  });
  return {
    ingredient,
    from,
    to,
    opening: { qty: r3(opening.qty), value: r2(opening.value) },
    lines,
    totals: {
      inQty: r3(totals.inQty),
      outQty: r3(totals.outQty),
      inValue: r2(totals.inValue),
      outValue: r2(totals.outValue),
    },
    closing: { qty: r3(balQty), value: r2(balVal) },
  };
}
