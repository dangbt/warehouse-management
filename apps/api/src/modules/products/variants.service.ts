import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { Axis, buildCombos, buildItemName, buildSku } from './sku';
import { mapUniqueError } from './unique-conflict';

export interface GenerateBody {
  attributes: { attribute_id: string; value_ids: string[] }[];
  unit?: string;
  cost_per_unit?: number;
  sale_price?: number;
}

export interface GenerateResult {
  created: number;
  reactivated: number;
  deactivated: number;
  deleted: number;
  unchanged: number;
  items: { id: string; sku: string | null; name: string; isActive: boolean }[];
}

@Injectable()
export class VariantsService {
  constructor(private prisma: PrismaService) {}

  /** Nạp & kiểm tra ma trận → các trục (attribute + giá trị đã chọn), theo thứ tự attribute.sort. */
  private async loadAxes(body: GenerateBody): Promise<{ axes: Axis[]; sorts: Map<string, number> }> {
    if (!Array.isArray(body?.attributes)) throw new BadRequestException('Thiếu ma trận thuộc tính');
    const ids = body.attributes.map((a) => a.attribute_id);
    if (new Set(ids).size !== ids.length) throw new BadRequestException('Thuộc tính bị lặp trong ma trận');
    const attrs = await this.prisma.productAttribute.findMany({
      where: { id: { in: ids } },
      include: { values: true },
      orderBy: [{ sort: 'asc' }, { code: 'asc' }],
    });
    if (attrs.length !== ids.length) throw new BadRequestException('Thuộc tính không tồn tại');
    const sorts = new Map<string, number>();
    const axes: Axis[] = attrs.map((attr, i) => {
      sorts.set(attr.id, i);
      const wanted = new Set(body.attributes.find((a) => a.attribute_id === attr.id)?.value_ids ?? []);
      const values = attr.values.filter((v) => wanted.has(v.id)).sort((a, b) => a.sort - b.sort || a.value.localeCompare(b.value));
      if (values.length !== wanted.size) throw new BadRequestException(`Giá trị không thuộc thuộc tính ${attr.name}`);
      return { attributeId: attr.id, attributeCode: attr.code, values: values.map((v) => ({ id: v.id, value: v.value, code: v.code })) };
    });
    return { axes, sorts };
  }

  /** Các item (trong danh sách) đã có phát sinh: giao dịch, nhập, kiểm kê, trả hàng, công thức, lô hoặc còn tồn. */
  private async usedIds(tx: Prisma.TransactionClient, items: { id: string; currentStock: Prisma.Decimal }[]): Promise<Set<string>> {
    const ids = items.map((i) => i.id);
    const used = new Set(items.filter((i) => Number(i.currentStock) !== 0).map((i) => i.id));
    if (ids.length === 0) return used;
    const where = { ingredientId: { in: ids } };
    const sel = { select: { ingredientId: true }, distinct: ['ingredientId' as const], where };
    const rows = await Promise.all([
      tx.stockTransaction.findMany(sel),
      tx.importOrderItem.findMany(sel),
      tx.stocktakeItem.findMany(sel),
      tx.purchaseReturnItem.findMany(sel),
      tx.recipeIngredient.findMany(sel),
      tx.ingredientBatch.findMany(sel),
    ]);
    rows.flat().forEach((r) => used.add(r.ingredientId));
    return used;
  }

  /**
   * Đồng bộ item con của product theo ma trận: chỉ sinh item còn thiếu, bật lại item inactive
   * nằm trong ma trận; item ngoài ma trận → có phát sinh thì inactive, chưa phát sinh thì xoá.
   */
  async generate(productId: string, body: GenerateBody): Promise<GenerateResult> {
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw new NotFoundException('Sản phẩm không tồn tại');
    const { axes, sorts } = await this.loadAxes(body);
    const combos = buildCombos(axes);
    const wanted = new Set(combos.map((c) => c.key));

    try {
      return await this.prisma.$transaction(async (tx) => {
        const existing = await tx.ingredient.findMany({ where: { productId } });
        const byKey = new Map(existing.filter((e) => e.variantKey).map((e) => [e.variantKey as string, e]));
        const res: GenerateResult = { created: 0, reactivated: 0, deactivated: 0, deleted: 0, unchanged: 0, items: [] };

        await tx.productAttributeLink.deleteMany({ where: { productId } });
        await tx.productAttributeLink.createMany({
          data: axes.map((a) => ({ productId, attributeId: a.attributeId, sort: sorts.get(a.attributeId) ?? 0 })),
        });

        const activeAxes = axes.filter((a) => a.values.length > 0);
        for (const combo of combos) {
          const found = byKey.get(combo.key);
          if (found) {
            if (found.isActive) res.unchanged++;
            else {
              await tx.ingredient.update({ where: { id: found.id }, data: { isActive: true } });
              res.reactivated++;
            }
            continue;
          }
          const created = await tx.ingredient.create({
            data: {
              name: buildItemName(product.name, combo),
              sku: buildSku(product.code, axes, combo, product.skuTemplate),
              variantKey: combo.key,
              productId,
              unit: body.unit ?? product.unit,
              category: product.category ?? 'Khác',
              groupId: product.groupId,
              costPerUnit: body.cost_per_unit ?? 0,
              minStock: 0,
              salePrice: body.sale_price ?? product.basePrice,
              attributeValues: {
                create: combo.picks.map((v, i) => ({ attributeId: activeAxes[i].attributeId, attributeValueId: v.id })),
              },
            },
          });
          res.created++;
          res.items.push({ id: created.id, sku: created.sku, name: created.name, isActive: true });
        }

        const stale = existing.filter((e) => e.isActive && e.variantKey && !wanted.has(e.variantKey));
        const used = await this.usedIds(tx, stale);
        for (const item of stale) {
          if (used.has(item.id)) {
            await tx.ingredient.update({ where: { id: item.id }, data: { isActive: false } });
            res.deactivated++;
          } else {
            await tx.ingredient.delete({ where: { id: item.id } });
            res.deleted++;
          }
        }
        return res;
      });
    } catch (e) {
      return mapUniqueError(e);
    }
  }
}
