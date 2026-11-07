import { buildStockMatrix, cellStatus, groupLowStockByProduct, type MatrixProductInput } from './stock-matrix';

const val = (value: string, sort: number) => ({ value, sort });
const v = (id: string, color: string, size: string, stock: number, min = 0) => ({
  ingredientId: id,
  sku: id,
  currentStock: stock,
  minStock: min,
  values: { COLOR: val(color, color === 'Đỏ' ? 0 : 1), SIZE: val(size, size === 'M' ? 0 : 1) },
});

const product: MatrixProductInput = {
  productId: 'p',
  code: 'AO',
  name: 'Áo',
  category: null,
  attributes: [
    { code: 'SIZE', name: 'Size' },
    { code: 'COLOR', name: 'Màu' },
  ],
  variants: [v('a', 'Đỏ', 'M', 5, 2), v('b', 'Đỏ', 'L', 0), v('c', 'Xanh', 'M', 2, 3)],
};

describe('stock matrix', () => {
  it('màu là hàng, size là cột; tổng hàng/cột/tổng chung; ô thiếu biến thể = null', () => {
    const m = buildStockMatrix(product);
    expect(m.rows).toEqual(['Đỏ', 'Xanh']);
    expect(m.cols).toEqual(['M', 'L']);
    expect(m.cells[1][1]).toBeNull();
    expect(m.rowTotals).toEqual([5, 2]);
    expect(m.colTotals).toEqual([7, 0]);
    expect(m.grandTotal).toBe(7);
  });

  it('tô trạng thái: hết hàng, dưới mức tối thiểu, đủ', () => {
    const m = buildStockMatrix(product);
    expect(m.cells[0][0]?.status).toBe('ok');
    expect(m.cells[0][1]?.status).toBe('out');
    expect(m.cells[1][0]?.status).toBe('low');
    expect(cellStatus(3, 3)).toBe('low');
  });

  it('gom tồn thấp theo SP', () => {
    const base = { unit: 'cái', productId: 'p', productCode: 'AO', productName: 'Áo', sku: null };
    const r = groupLowStockByProduct([
      { ...base, id: '1', name: 'a', currentStock: 0, minStock: 2 },
      { ...base, id: '2', name: 'b', currentStock: 1, minStock: 2 },
    ]);
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({ outCount: 1, lowCount: 1, totalStock: 1 });
  });
});
