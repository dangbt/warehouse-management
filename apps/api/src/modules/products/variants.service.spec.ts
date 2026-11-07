/* eslint-disable @typescript-eslint/require-await -- mock giả lập trả Promise, không cần await */
import { BadRequestException } from '@nestjs/common';
import { VariantsService } from './variants.service';
import { toCode } from './sku';

type Item = {
  id: string;
  productId: string;
  variantKey: string | null;
  isActive: boolean;
  sku: string;
  name: string;
  currentStock: number;
};

/** Prisma giả lập tối thiểu, đủ cho VariantsService.generate. */
function makeDb(opts: { usedIds?: Set<string> } = {}) {
  const mk = (arr: string[], prefix: string) => arr.map((v) => ({ id: `${prefix}-${v}`, value: v, code: toCode(v), sort: 0 }));
  const attrs = [
    { id: 'a-color', code: 'COLOR', name: 'Màu', sort: 0, values: mk(['Đỏ', 'Xanh'], 'c') },
    { id: 'a-size', code: 'SIZE', name: 'Size', sort: 1, values: mk(['S', 'M', 'L', 'XL'], 's') },
  ];
  const items: Item[] = [];
  let seq = 0;
  const used = opts.usedIds ?? new Set<string>();
  const usageTable = {
    findMany: async ({ where }: any) => where.ingredientId.in.filter((i: string) => used.has(i)).map((i: string) => ({ ingredientId: i })),
  };
  const db: any = {
    product: {
      findUnique: async () => ({
        id: 'p1',
        code: 'AT01',
        name: 'Áo thun',
        unit: 'cái',
        category: 'Áo',
        groupId: null,
        basePrice: 100,
        skuTemplate: null,
      }),
    },
    productAttribute: { findMany: async ({ where }: any) => attrs.filter((a) => where.id.in.includes(a.id)) },
    productAttributeLink: { deleteMany: async () => ({}), createMany: async () => ({}) },
    ingredient: {
      findMany: async () => items.map((i) => ({ ...i })),
      create: async ({ data }: any) => {
        if (items.some((i) => i.sku === data.sku)) throw Object.assign(new Error('dup'), { code: 'P2002', meta: { target: ['sku'] } });
        const it: Item = {
          id: `i${++seq}`,
          productId: data.productId,
          variantKey: data.variantKey,
          isActive: true,
          sku: data.sku,
          name: data.name,
          currentStock: 0,
        };
        items.push(it);
        return it;
      },
      update: async ({ where, data }: any) => Object.assign(items.find((i) => i.id === where.id)!, data),
      delete: async ({ where }: any) =>
        items.splice(
          items.findIndex((i) => i.id === where.id),
          1,
        ),
    },
    stockTransaction: usageTable,
    importOrderItem: { findMany: async () => [] },
    stocktakeItem: { findMany: async () => [] },
    purchaseReturnItem: { findMany: async () => [] },
    recipeIngredient: { findMany: async () => [] },
    ingredientBatch: { findMany: async () => [] },
  };
  db.$transaction = async (cb: any) => cb(db);
  return { db, items, attrs };
}

const matrix = (colors: string[], sizes: string[]) => ({
  attributes: [
    { attribute_id: 'a-color', value_ids: colors.map((c) => `c-${c}`) },
    { attribute_id: 'a-size', value_ids: sizes.map((s) => `s-${s}`) },
  ],
});

describe('VariantsService.generate', () => {
  it('3 size × 2 màu → đúng 6 item, SKU đúng mẫu; chạy lại không tạo trùng', async () => {
    const { db, items } = makeDb();
    const svc = new VariantsService(db);
    const r1 = await svc.generate('p1', matrix(['Đỏ', 'Xanh'], ['S', 'M', 'L']));
    expect(r1.created).toBe(6);
    expect(items.map((i) => i.sku).sort()).toEqual(['AT01-DO-L', 'AT01-DO-M', 'AT01-DO-S', 'AT01-XANH-L', 'AT01-XANH-M', 'AT01-XANH-S']);
    expect(items.find((i) => i.sku === 'AT01-DO-S')!.name).toBe('Áo thun Đỏ S');
    const r2 = await svc.generate('p1', matrix(['Đỏ', 'Xanh'], ['S', 'M', 'L']));
    expect(r2).toMatchObject({ created: 0, unchanged: 6 });
    expect(items).toHaveLength(6);
  });

  it('thêm giá trị mới chỉ sinh item thiếu', async () => {
    const { db, items } = makeDb();
    const svc = new VariantsService(db);
    await svc.generate('p1', matrix(['Đỏ', 'Xanh'], ['S', 'M', 'L']));
    const r = await svc.generate('p1', matrix(['Đỏ', 'Xanh'], ['S', 'M', 'L', 'XL']));
    expect(r.created).toBe(2);
    expect(items).toHaveLength(8);
  });

  it('bỏ giá trị: item có giao dịch → inactive (không xoá), chưa có → xoá; thêm lại thì bật lại', async () => {
    const { db, items } = makeDb();
    const svc = new VariantsService(db);
    await svc.generate('p1', matrix(['Đỏ', 'Xanh'], ['S', 'M', 'L']));
    const usedL = items.find((i) => i.sku === 'AT01-DO-L')!;
    const usedXL = items.find((i) => i.sku === 'AT01-XANH-L')!;
    const used = new Set([usedL.id]); // chỉ Đỏ-L có giao dịch
    const { db: db2 } = { db };
    db2.stockTransaction.findMany = async ({ where }: any) =>
      where.ingredientId.in.filter((i: string) => used.has(i)).map((i: string) => ({ ingredientId: i }));

    const r = await svc.generate('p1', matrix(['Đỏ', 'Xanh'], ['S', 'M']));
    expect(r).toMatchObject({ deactivated: 1, deleted: 1, unchanged: 4 });
    expect(items.find((i) => i.id === usedL.id)!.isActive).toBe(false);
    expect(items.some((i) => i.id === usedXL.id)).toBe(false);

    const r2 = await svc.generate('p1', matrix(['Đỏ', 'Xanh'], ['S', 'M', 'L']));
    expect(r2).toMatchObject({ reactivated: 1, created: 1 });
    expect(items.find((i) => i.id === usedL.id)!.isActive).toBe(true);
  });

  it('SKU trùng với mã hàng khác → 409 có error code', async () => {
    const { db, items } = makeDb();
    items.push({ id: 'x', productId: 'other', variantKey: null, isActive: true, sku: 'AT01-DO-S', name: 'khác', currentStock: 0 });
    const svc = new VariantsService(db);
    await expect(svc.generate('p1', matrix(['Đỏ'], ['S']))).rejects.toMatchObject({
      status: 409,
      response: { code: 'SKU_DUPLICATE' },
    });
  });

  it('giá trị không thuộc thuộc tính → 400', async () => {
    const { db } = makeDb();
    const svc = new VariantsService(db);
    await expect(svc.generate('p1', { attributes: [{ attribute_id: 'a-color', value_ids: ['s-S'] }] })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
