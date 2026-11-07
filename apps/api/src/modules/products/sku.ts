/** Hàm thuần: chuẩn hoá mã, sinh SKU + tổ hợp biến thể. */

/** Bỏ dấu tiếng Việt, viết hoa, ký tự lạ → '-'. */
export function toCode(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export interface AxisValue {
  id: string;
  value: string;
  code: string;
}
export interface Axis {
  attributeId: string;
  attributeCode: string;
  values: AxisValue[];
}
export interface Combo {
  /** theo đúng thứ tự axes */
  picks: AxisValue[];
  key: string;
}

export const DEFAULT_SKU_TEMPLATE = '{PRODUCT}-{COLOR}-{SIZE}';

/** Khoá tổ hợp: "attrId:valueId|attrId:valueId" sắp theo attrId để ổn định. */
export function comboKey(pairs: { attributeId: string; valueId: string }[]): string {
  return [...pairs]
    .sort((a, b) => a.attributeId.localeCompare(b.attributeId))
    .map((p) => `${p.attributeId}:${p.valueId}`)
    .join('|');
}

/** Tích Descartes các trục thuộc tính. Trục không có giá trị bị bỏ qua. */
export function buildCombos(axes: Axis[]): Combo[] {
  const active = axes.filter((a) => a.values.length > 0);
  if (active.length === 0) return [];
  let acc: AxisValue[][] = [[]];
  for (const axis of active) acc = acc.flatMap((prefix) => axis.values.map((v) => [...prefix, v]));
  return acc.map((picks) => ({
    picks,
    key: comboKey(picks.map((v, i) => ({ attributeId: active[i].attributeId, valueId: v.id }))),
  }));
}

/**
 * Sinh SKU. Template dùng {PRODUCT} và {<MÃ THUỘC TÍNH>} (vd {COLOR}, {SIZE}).
 * Mặc định PRODUCT-COLOR-SIZE; thuộc tính không có trong template (hoặc template mặc định
 * mà sản phẩm thiếu COLOR/SIZE) được nối thêm vào cuối theo thứ tự trục.
 */
export function buildSku(productCode: string, axes: Axis[], combo: Combo, template?: string | null): string {
  const active = axes.filter((a) => a.values.length > 0);
  const byAttr = new Map<string, string>();
  combo.picks.forEach((v, i) => byAttr.set(active[i].attributeCode, v.code));
  const used = new Set<string>();
  let sku = (template || DEFAULT_SKU_TEMPLATE).replace(/\{([A-Za-z0-9_]+)\}/g, (_m, token: string) => {
    const t = token.toUpperCase();
    if (t === 'PRODUCT') return productCode;
    used.add(t);
    return byAttr.get(t) ?? '';
  });
  for (const [attr, code] of byAttr) if (!used.has(attr)) sku += `-${code}`;
  return toCode(sku);
}

/** Tên item = tên SP + giá trị thuộc tính. */
export function buildItemName(productName: string, combo: Combo): string {
  return [productName, ...combo.picks.map((p) => p.value)].join(' ');
}
