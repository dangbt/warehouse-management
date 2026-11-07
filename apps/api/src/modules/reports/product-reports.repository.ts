import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { LowStockVariantInput, MatrixProductInput } from './stock-matrix';

/** Query dữ liệu biến thể cho ma trận tồn + tồn thấp theo SP (WMS-22). */
@Injectable()
export class ProductReportsRepository {
  constructor(private prisma: PrismaService) {}

  async matrixInputs(q: { productId?: string; category?: string }): Promise<MatrixProductInput[]> {
    const products = await this.prisma.product.findMany({
      where: { isActive: true, ...(q.productId ? { id: q.productId } : {}), ...(q.category ? { category: q.category } : {}) },
      orderBy: { name: 'asc' },
      include: {
        attributes: { orderBy: { sort: 'asc' }, include: { attribute: true } },
        items: {
          where: { isActive: true },
          include: { attributeValues: { include: { attributeValue: { include: { attribute: true } } } } },
        },
      },
    });
    return products
      .filter((p) => p.items.length > 0)
      .map((p) => ({
        productId: p.id,
        code: p.code,
        name: p.name,
        category: p.category,
        attributes: p.attributes.map((l) => ({ code: l.attribute.code, name: l.attribute.name })),
        variants: p.items.map((i) => ({
          ingredientId: i.id,
          sku: i.sku,
          currentStock: Number(i.currentStock),
          minStock: Number(i.minStock),
          values: Object.fromEntries(
            i.attributeValues.map((a) => [a.attributeValue.attribute.code, { value: a.attributeValue.value, sort: a.attributeValue.sort }]),
          ),
        })),
      }));
  }

  async lowStockVariants(): Promise<LowStockVariantInput[]> {
    const items = await this.prisma.ingredient.findMany({
      where: { productId: { not: null }, isActive: true, trackStock: true },
      include: { product: true },
    });
    return items
      .filter((i) => Number(i.currentStock) <= Number(i.minStock))
      .map((i) => ({
        id: i.id,
        name: i.name,
        sku: i.sku,
        unit: i.unit,
        currentStock: Number(i.currentStock),
        minStock: Number(i.minStock),
        productId: i.product!.id,
        productCode: i.product!.code,
        productName: i.product!.name,
      }));
  }
}
