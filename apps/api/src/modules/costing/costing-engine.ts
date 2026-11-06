/**
 * Engine tính giá xuất kho (hàm thuần, không phụ thuộc DB) cho 3 phương pháp:
 *  - AVG_PERIOD: bình quân cuối kỳ = (GT đầu kỳ + GT nhập trong kỳ) / (SL đầu kỳ + SL nhập trong kỳ), áp cho mọi xuất trong kỳ.
 *  - AVG_MOVING: bình quân tức thời = GT tồn / SL tồn tại thời điểm xuất.
 *  - FIFO: nhập trước xuất trước theo lớp giá nhập.
 * Mỗi NL một sổ (ledger) các dòng nhập/xuất theo thứ tự thời gian.
 */

export type CostingMethod = 'AVG_PERIOD' | 'AVG_MOVING' | 'FIFO';
export const COSTING_METHODS: CostingMethod[] = ['AVG_PERIOD', 'AVG_MOVING', 'FIFO'];

export const IN_TYPES = new Set(['IMPORT', 'PROCESS_IN']);
export const OUT_TYPES = new Set(['EXPORT', 'ORDER_DEDUCT', 'PROCESS_OUT', 'RETURN']);

/** Chiều nhập/xuất của giao dịch: theo loại; STOCKTAKE_ADJUST theo dấu SL. */
export function directionOf(type: string, quantity: number): 'IN' | 'OUT' | null {
  if (IN_TYPES.has(type)) return 'IN';
  if (OUT_TYPES.has(type)) return 'OUT';
  if (type === 'STOCKTAKE_ADJUST') return quantity > 0 ? 'IN' : quantity < 0 ? 'OUT' : null;
  return null;
}

export interface LedgerEntry {
  id: string;
  direction: 'IN' | 'OUT';
  /** Số lượng (dương). */
  qty: number;
  /** Nhập: giá trị nhập (> = 0). Xuất ngoài kỳ (AVG_PERIOD): giá vốn đã lưu, null = tự tính bình quân tức thời. */
  totalCost: number | null;
  /** Dòng thuộc kỳ cần tính (xuất trong kỳ sẽ được ghi giá). */
  inPeriod: boolean;
}

export interface CostResult {
  unitCost: number;
  totalCost: number;
}

export const round4 = (n: number) => Math.round(n * 10000) / 10000;
export const round2 = (n: number) => Math.round(n * 100) / 100;

/** Trạng thái tồn để phát sinh giá xuất theo từng phương pháp. */
interface CostState {
  receive(qty: number, value: number): void;
  /** Xuất `qty`, trả giá trị xuất (đã làm tròn 2). */
  issue(qty: number): number;
}

class MovingAverageState implements CostState {
  qty = 0;
  value = 0;
  constructor(private fallbackUnit: number) {}
  receive(qty: number, value: number) {
    this.qty += qty;
    this.value += value;
  }
  issue(qty: number): number {
    const unit = this.qty > 1e-9 ? round4(this.value / this.qty) : this.fallbackUnit;
    const out = qty >= this.qty - 1e-9 && this.qty > 1e-9 ? round2(this.value) : round2(qty * unit);
    this.qty = Math.max(0, this.qty - qty);
    this.value = this.qty <= 1e-9 ? 0 : this.value - out;
    return out;
  }
}

class FifoState implements CostState {
  private layers: { qty: number; unit: number }[] = [];
  private lastUnit: number;
  constructor(fallbackUnit: number) {
    this.lastUnit = fallbackUnit;
  }
  receive(qty: number, value: number) {
    if (qty <= 0) return;
    const unit = value / qty;
    this.layers.push({ qty, unit });
    this.lastUnit = unit;
  }
  issue(qty: number): number {
    let remaining = qty;
    let value = 0;
    while (remaining > 1e-9 && this.layers.length > 0) {
      const layer = this.layers[0];
      const take = Math.min(layer.qty, remaining);
      value += take * layer.unit;
      layer.qty -= take;
      remaining -= take;
      if (layer.qty <= 1e-9) this.layers.shift();
    }
    if (remaining > 1e-9) value += remaining * this.lastUnit; // xuất âm tồn: dùng giá nhập gần nhất
    return round2(value);
  }
}

function finish(qty: number, totalCost: number): CostResult {
  return { unitCost: qty > 0 ? round4(totalCost / qty) : 0, totalCost };
}

/**
 * Tính giá cho các dòng xuất `inPeriod` của một NL.
 * @param entries sổ NL theo thứ tự thời gian (gồm cả lịch sử trước kỳ)
 * @param fallbackUnit đơn giá dự phòng khi chưa có tồn/nhập (vd giá vốn hiện hành của NL)
 */
export function costLedger(method: CostingMethod, entries: LedgerEntry[], fallbackUnit = 0): Map<string, CostResult> {
  const result = new Map<string, CostResult>();

  if (method === 'AVG_PERIOD') {
    // Tồn đầu kỳ: cộng dồn dòng ngoài kỳ theo giá đã lưu (xuất chưa có giá → bình quân tức thời)
    const opening = new MovingAverageState(fallbackUnit);
    let periodInQty = 0;
    let periodInValue = 0;
    for (const e of entries) {
      if (e.inPeriod) {
        if (e.direction === 'IN') {
          periodInQty += e.qty;
          periodInValue += e.totalCost ?? e.qty * fallbackUnit;
        }
      } else if (e.direction === 'IN') {
        opening.receive(e.qty, e.totalCost ?? e.qty * fallbackUnit);
      } else if (e.totalCost != null) {
        opening.qty = Math.max(0, opening.qty - e.qty);
        opening.value = opening.qty <= 1e-9 ? 0 : opening.value - e.totalCost;
      } else {
        opening.issue(e.qty);
      }
    }
    const totalQty = opening.qty + periodInQty;
    const avg = totalQty > 1e-9 ? round4((opening.value + periodInValue) / totalQty) : fallbackUnit;
    for (const e of entries) {
      if (e.inPeriod && e.direction === 'OUT') result.set(e.id, finish(e.qty, round2(e.qty * avg)));
    }
    return result;
  }

  const state: CostState = method === 'FIFO' ? new FifoState(fallbackUnit) : new MovingAverageState(fallbackUnit);
  for (const e of entries) {
    if (e.direction === 'IN') {
      state.receive(e.qty, e.totalCost ?? e.qty * fallbackUnit);
    } else {
      const total = state.issue(e.qty);
      if (e.inPeriod) result.set(e.id, finish(e.qty, total));
    }
  }
  return result;
}
