/**
 * Ma trận tồn kho size × màu (WMS-22): mỗi sản phẩm 1 bảng, hàng = thuộc tính màu, cột = thuộc tính size.
 * Hàm thuần — query nằm ở product-reports.repository.ts.
 */

export type CellStatus = 'out' | 'low' | 'ok';

export interface MatrixVariantInput {
  ingredientId: string;
  sku: string | null;
  currentStock: number;
  minStock: number;
  /** Giá trị thuộc tính của biến thể theo mã thuộc tính, kèm thứ tự sắp xếp. */
  values: Record<string, { value: string; sort: number }>;
}

export interface MatrixProductInput {
  productId: string;
  code: string;
  name: string;
  category: string | null;
  /** Thuộc tính của SP theo thứ tự trục: [{ code, name }]. */
  attributes: { code: string; name: string }[];
  variants: MatrixVariantInput[];
}

export interface MatrixCell {
  qty: number;
  minStock: number;
  status: CellStatus;
  ingredientIds: string[];
}

export interface StockMatrix {
  productId: string;
  code: string;
  name: string;
  category: string | null;
  rowAttribute: string;
  colAttribute: string;
  rows: string[];
  cols: string[];
  /** cells[r][c]; null = không có biến thể ở ô đó. */
  cells: (MatrixCell | null)[][];
  rowTotals: number[];
  colTotals: number[];
  grandTotal: number;
}

export interface StockMatrixReport {
  products: StockMatrix[];
}

const r3 = (n: number) => Math.round(n * 1000) / 1000;
const NONE = '—';

export function cellStatus(qty: number, minStock: number): CellStatus {
  if (qty <= 0) return 'out';
  if (minStock > 0 && qty <= minStock) return 'low';
  return 'ok';
}

/** Chọn trục: ưu tiên mã COLOR (hàng) và SIZE (cột); không có thì lấy 2 thuộc tính đầu theo thứ tự trục. */
export function pickAxes(attrs: { code: string; name: string }[]): {
  row?: { code: string; name: string };
  col?: { code: string; name: string };
} {
  const color = attrs.find((a) => a.code.toUpperCase() === 'COLOR');
  const size = attrs.find((a) => a.code.toUpperCase() === 'SIZE');
  if (color && size) return { row: color, col: size };
  const rest = attrs.filter((a) => a !== color && a !== size);
  const ordered = [color, size, ...rest].filter((a): a is { code: string; name: string } => !!a);
  return { row: ordered[0], col: ordered[1] };
}

function orderedValues(variants: MatrixVariantInput[], code?: string): string[] {
  if (!code) return [NONE];
  const seen = new Map<string, number>();
  for (const v of variants) {
    const x = v.values[code];
    if (x && !seen.has(x.value)) seen.set(x.value, x.sort);
  }
  if (seen.size === 0) return [NONE];
  return [...seen.entries()].sort((a, b) => a[1] - b[1] || a[0].localeCompare(b[0], 'vi')).map(([k]) => k);
}

export function buildStockMatrix(p: MatrixProductInput): StockMatrix {
  const { row, col } = pickAxes(p.attributes);
  const rows = orderedValues(p.variants, row?.code);
  const cols = orderedValues(p.variants, col?.code);
  const acc = rows.map(() => cols.map((): { qty: number; min: number; ids: string[] } | null => null));
  for (const v of p.variants) {
    const ri = rows.indexOf((row && v.values[row.code]?.value) || NONE);
    const ci = cols.indexOf((col && v.values[col.code]?.value) || NONE);
    if (ri < 0 || ci < 0) continue;
    // Thuộc tính thừa (>2 trục) cùng rơi vào 1 ô: cộng dồn
    const cur = acc[ri][ci] ?? { qty: 0, min: 0, ids: [] };
    cur.qty += v.currentStock;
    cur.min += v.minStock;
    cur.ids.push(v.ingredientId);
    acc[ri][ci] = cur;
  }
  const cells = acc.map((line) =>
    line.map((c): MatrixCell | null =>
      c ? { qty: r3(c.qty), minStock: r3(c.min), status: cellStatus(c.qty, c.min), ingredientIds: c.ids } : null,
    ),
  );
  const rowTotals = cells.map((line) => r3(line.reduce((s, c) => s + (c?.qty ?? 0), 0)));
  const colTotals = cols.map((_, ci) => r3(cells.reduce((s, line) => s + (line[ci]?.qty ?? 0), 0)));
  return {
    productId: p.productId,
    code: p.code,
    name: p.name,
    category: p.category,
    rowAttribute: row?.name ?? '',
    colAttribute: col?.name ?? '',
    rows,
    cols,
    cells,
    rowTotals,
    colTotals,
    grandTotal: r3(rowTotals.reduce((s, n) => s + n, 0)),
  };
}

export function buildStockMatrixReport(products: MatrixProductInput[]): StockMatrixReport {
  return { products: products.map(buildStockMatrix) };
}

/* ---------- Tồn thấp gom theo SP (dashboard) ---------- */

export interface LowStockVariantInput {
  id: string;
  name: string;
  sku: string | null;
  unit: string;
  currentStock: number;
  minStock: number;
  productId: string;
  productCode: string;
  productName: string;
}

export interface LowStockProduct {
  productId: string;
  code: string;
  name: string;
  unit: string;
  lowCount: number;
  outCount: number;
  totalStock: number;
  variants: { id: string; name: string; sku: string | null; currentStock: number; minStock: number; status: CellStatus }[];
}

/** Gom các biến thể tồn thấp (current <= min) thành dòng theo SP; SP có nhiều biến thể thấp xếp trước. */
export function groupLowStockByProduct(items: LowStockVariantInput[]): LowStockProduct[] {
  const map = new Map<string, LowStockProduct>();
  for (const i of items) {
    let p = map.get(i.productId);
    if (!p) {
      p = {
        productId: i.productId,
        code: i.productCode,
        name: i.productName,
        unit: i.unit,
        lowCount: 0,
        outCount: 0,
        totalStock: 0,
        variants: [],
      };
      map.set(i.productId, p);
    }
    const status = cellStatus(i.currentStock, i.minStock);
    p.variants.push({ id: i.id, name: i.name, sku: i.sku, currentStock: i.currentStock, minStock: i.minStock, status });
    if (status === 'out') p.outCount++;
    else p.lowCount++;
    p.totalStock = r3(p.totalStock + i.currentStock);
  }
  return [...map.values()].sort((a, b) => b.outCount + b.lowCount - (a.outCount + a.lowCount) || a.name.localeCompare(b.name, 'vi'));
}
