import { buildCombos, buildItemName, buildSku, toCode, Axis } from './sku';

const size: Axis = {
  attributeId: 'a-size',
  attributeCode: 'SIZE',
  values: ['S', 'M', 'L'].map((v) => ({ id: `s-${v}`, value: v, code: v })),
};
const color: Axis = {
  attributeId: 'a-color',
  attributeCode: 'COLOR',
  values: [
    { id: 'c-do', value: 'Đỏ', code: toCode('Đỏ') },
    { id: 'c-xanh', value: 'Xanh lá', code: toCode('Xanh lá') },
  ],
};

describe('sku', () => {
  it('toCode bỏ dấu + viết hoa', () => {
    expect(toCode('Áo thun Đỏ')).toBe('AO-THUN-DO');
  });

  it('3 size × 2 màu → 6 tổ hợp, SKU đúng mẫu PRODUCT-COLOR-SIZE, không trùng', () => {
    const axes = [color, size];
    const combos = buildCombos(axes);
    expect(combos).toHaveLength(6);
    const skus = combos.map((c) => buildSku('AT01', axes, c));
    expect(new Set(skus).size).toBe(6);
    expect(skus).toContain('AT01-DO-S');
    expect(skus).toContain('AT01-XANH-LA-L');
    // chạy lại cho cùng kết quả (ổn định)
    expect(buildCombos(axes).map((c) => buildSku('AT01', axes, c))).toEqual(skus);
  });

  it('thứ tự trục không ảnh hưởng SKU mặc định', () => {
    const a = buildSku('AT01', [size, color], buildCombos([size, color])[0]);
    expect(a).toMatch(/^AT01-(DO|XANH-LA)-S$/);
  });

  it('template tuỳ chỉnh + thuộc tính thiếu trong template được nối cuối', () => {
    const axes = [color, size];
    const c = buildCombos(axes)[0];
    expect(buildSku('AT01', axes, c, '{PRODUCT}_{SIZE}')).toBe('AT01-S-DO');
  });

  it('tên item = tên SP + giá trị', () => {
    expect(buildItemName('Áo thun', buildCombos([color, size])[0])).toBe('Áo thun Đỏ S');
  });
});
