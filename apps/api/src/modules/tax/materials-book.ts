/**
 * Logic thuần (không phụ thuộc DB) để lập sổ chi tiết vật liệu, dụng cụ, sản phẩm,
 * hàng hoá — mẫu S2-HKD (Thông tư 88/2021/TT-BTC).
 *
 * Tách khỏi service để unit-test được: nhận danh sách phát sinh (`StockMovement`)
 * đã lấy từ `StockTransaction`, tính tồn đầu kỳ, các dòng nhập/xuất trong kỳ và
 * tồn cuối kỳ theo số lượng và giá trị.
 *
 * Bất biến kế toán: `tồn đầu (SL) + Σ nhập (SL) − Σ xuất (SL) = tồn cuối (SL)`.
 */

import { roundVnd } from './vat';

/**
 * Một phát sinh kho đã chuẩn hoá từ `StockTransaction`.
 *
 * `quantity` luôn là số dương (khối lượng phát sinh); chiều nhập/xuất xác định bởi
 * `direction`. `value` là giá trị của phát sinh (đã có/tự suy ra), luôn không âm.
 */
export interface StockMovement {
  /** Thời điểm phát sinh (ISO). */
  date: string;
  /** Chiều: nhập (tăng tồn) hoặc xuất (giảm tồn). */
  direction: 'IN' | 'OUT';
  /** Loại chứng từ gốc (IMPORT/EXPORT/PROCESS_IN/PROCESS_OUT/STOCKTAKE_ADJUST/RETURN). */
  type: string;
  /** Số hiệu/diễn giải chứng từ (lấy từ note hoặc referenceId). */
  document: string;
  /** Diễn giải nghiệp vụ. */
  description: string;
  /** Số lượng phát sinh (>= 0). */
  quantity: number;
  /** Giá trị phát sinh (>= 0). */
  value: number;
}

/** Một dòng phát sinh trong sổ, đã đánh STT và cột đơn giá. */
export interface MaterialsBookRow {
  stt: number;
  date: string;
  type: string;
  document: string;
  description: string;
  /** Số lượng nhập (0 nếu là dòng xuất). */
  inQuantity: number;
  /** Giá trị nhập (0 nếu là dòng xuất). */
  inValue: number;
  /** Số lượng xuất (0 nếu là dòng nhập). */
  outQuantity: number;
  /** Giá trị xuất (0 nếu là dòng nhập). */
  outValue: number;
}

/** Sổ chi tiết của một nguyên liệu trong kỳ. */
export interface MaterialsBookEntry {
  ingredientId: string;
  ingredientName: string;
  unit: string;
  /** Tồn đầu kỳ. */
  opening: { quantity: number; value: number };
  /** Các dòng phát sinh trong kỳ (theo thứ tự thời gian). */
  rows: MaterialsBookRow[];
  /** Cộng phát sinh trong kỳ. */
  totalIn: { quantity: number; value: number };
  totalOut: { quantity: number; value: number };
  /** Tồn cuối kỳ = tồn đầu + nhập − xuất. */
  closing: { quantity: number; value: number };
}

/** Làm tròn số lượng về 3 chữ số thập phân (khớp `@db.Decimal(10,3)` của schema). */
export function roundQty(value: number): number {
  return Math.round(value * 1000) / 1000;
}

/**
 * Lập sổ chi tiết cho một nguyên liệu từ tồn đầu kỳ và các phát sinh trong kỳ.
 *
 * @param ingredient  Thông tin nguyên liệu (id, tên, đơn vị).
 * @param openingQty  Số lượng tồn đầu kỳ (đã cộng dồn phát sinh trước kỳ).
 * @param openingValue Giá trị tồn đầu kỳ.
 * @param movements   Phát sinh trong kỳ, đã sắp theo thời gian tăng dần.
 */
export function buildMaterialsBookEntry(
  ingredient: { id: string; name: string; unit: string },
  openingQty: number,
  openingValue: number,
  movements: StockMovement[],
): MaterialsBookEntry {
  const rows: MaterialsBookRow[] = [];
  let totalInQty = 0;
  let totalInValue = 0;
  let totalOutQty = 0;
  let totalOutValue = 0;

  movements.forEach((m, i) => {
    const qty = roundQty(m.quantity);
    const value = roundVnd(m.value);
    if (m.direction === 'IN') {
      totalInQty = roundQty(totalInQty + qty);
      totalInValue += value;
      rows.push({
        stt: i + 1,
        date: m.date,
        type: m.type,
        document: m.document,
        description: m.description,
        inQuantity: qty,
        inValue: value,
        outQuantity: 0,
        outValue: 0,
      });
    } else {
      totalOutQty = roundQty(totalOutQty + qty);
      totalOutValue += value;
      rows.push({
        stt: i + 1,
        date: m.date,
        type: m.type,
        document: m.document,
        description: m.description,
        inQuantity: 0,
        inValue: 0,
        outQuantity: qty,
        outValue: value,
      });
    }
  });

  const opening = { quantity: roundQty(openingQty), value: roundVnd(openingValue) };
  const totalIn = { quantity: totalInQty, value: totalInValue };
  const totalOut = { quantity: totalOutQty, value: totalOutValue };
  // Bất biến: tồn cuối = tồn đầu + nhập − xuất (cả SL lẫn giá trị).
  const closing = {
    quantity: roundQty(opening.quantity + totalIn.quantity - totalOut.quantity),
    value: roundVnd(opening.value + totalIn.value - totalOut.value),
  };

  return {
    ingredientId: ingredient.id,
    ingredientName: ingredient.name,
    unit: ingredient.unit,
    opening,
    rows,
    totalIn,
    totalOut,
    closing,
  };
}

/**
 * Chuẩn hoá một `StockTransaction` thô thành `StockMovement` cho sổ.
 *
 * Chiều nhập/xuất xác định theo `type` (không tin dấu `quantity` vì quy ước lưu
 * không đồng nhất giữa các loại):
 * - Nhập tồn (IN): `IMPORT`, `PROCESS_IN`.
 * - Xuất tồn (OUT): `EXPORT`, `PROCESS_OUT`, `RETURN`.
 * - `STOCKTAKE_ADJUST`: dấu của `quantity` quyết định (dương ⇒ IN, âm ⇒ OUT).
 *
 * Số lượng luôn lấy giá trị tuyệt đối. Giá trị:
 * - Có `totalPrice` ⇒ dùng `|totalPrice|`.
 * - Không có ⇒ số lượng × giá vốn bình quân (`avgCost`) do caller truyền vào.
 */
export function normalizeMovement(
  tx: { type: string; quantity: number; totalPrice: number | null; note: string | null; referenceId: string | null; createdAt: string },
  avgCost: number,
): StockMovement {
  const IN_TYPES = new Set(['IMPORT', 'PROCESS_IN']);
  const OUT_TYPES = new Set(['EXPORT', 'PROCESS_OUT', 'RETURN']);

  let direction: 'IN' | 'OUT';
  if (IN_TYPES.has(tx.type)) {
    direction = 'IN';
  } else if (OUT_TYPES.has(tx.type)) {
    direction = 'OUT';
  } else {
    // STOCKTAKE_ADJUST (và các loại khác): theo dấu số lượng.
    direction = tx.quantity >= 0 ? 'IN' : 'OUT';
  }

  const quantity = Math.abs(tx.quantity);
  const value = tx.totalPrice != null ? Math.abs(tx.totalPrice) : quantity * avgCost;

  return {
    date: tx.createdAt,
    direction,
    type: tx.type,
    document: tx.note ?? tx.referenceId ?? '',
    description: tx.note ?? '',
    quantity,
    value,
  };
}
