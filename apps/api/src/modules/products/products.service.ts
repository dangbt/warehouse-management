import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { toCode } from './sku';
import { mapUniqueError } from './unique-conflict';

export interface ProductBody {
  code?: string;
  name?: string;
  category?: string | null;
  group_id?: string | null;
  brand?: string | null;
  unit?: string;
  base_price?: number | null;
  description?: string | null;
  image_url?: string | null;
  sku_template?: string | null;
  is_active?: boolean;
}

const INCLUDE = {
  attributes: { include: { attribute: { include: { values: true } } }, orderBy: { sort: 'asc' as const } },
};

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  async findAll(q: { page?: string; limit?: string; search?: string; active?: string }) {
    const page = Math.max(1, +(q.page || 1));
    const limit = Math.min(1000, Math.max(1, +(q.limit || 20)));
    const where: Prisma.ProductWhereInput = {};
    if (q.active === 'true') where.isActive = true;
    if (q.active === 'false') where.isActive = false;
    if (q.search) {
      where.OR = [
        { name: { contains: q.search, mode: 'insensitive' } },
        { code: { contains: q.search, mode: 'insensitive' } },
        { brand: { contains: q.search, mode: 'insensitive' } },
      ];
    }
    const [data, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { name: 'asc' },
        include: { _count: { select: { items: true } } },
      }),
      this.prisma.product.count({ where }),
    ]);
    return { data, meta: { page, limit, total } };
  }

  async findOne(id: string) {
    const p = await this.prisma.product.findUnique({
      where: { id },
      include: { ...INCLUDE, items: { include: { attributeValues: { include: { attributeValue: true } } }, orderBy: { name: 'asc' } } },
    });
    if (!p) throw new NotFoundException('Sản phẩm không tồn tại');
    return p;
  }

  async create(b: ProductBody & { code: string; name: string }) {
    try {
      return await this.prisma.product.create({ data: { ...this.toData(b), code: toCode(b.code), name: b.name } });
    } catch (e) {
      return mapUniqueError(e);
    }
  }

  async update(id: string, b: ProductBody) {
    await this.mustFind(id);
    try {
      return await this.prisma.product.update({
        where: { id },
        data: { ...this.toData(b), code: b.code ? toCode(b.code) : undefined, name: b.name },
      });
    } catch (e) {
      return mapUniqueError(e);
    }
  }

  /** Product còn item → không xoá (tồn kho/chứng từ nằm ở item); chỉ xoá khi chưa sinh biến thể. */
  async remove(id: string) {
    await this.mustFind(id);
    const items = await this.prisma.ingredient.count({ where: { productId: id } });
    if (items > 0)
      throw new ConflictException({
        statusCode: 409,
        code: 'PRODUCT_HAS_ITEMS',
        message: 'Sản phẩm đã có mã hàng, hãy ngừng kinh doanh thay vì xoá',
      });
    return this.prisma.product.delete({ where: { id } });
  }

  private async mustFind(id: string) {
    const p = await this.prisma.product.findUnique({ where: { id } });
    if (!p) throw new NotFoundException('Sản phẩm không tồn tại');
    return p;
  }

  private toData(b: ProductBody) {
    return {
      category: b.category,
      groupId: b.group_id,
      brand: b.brand,
      unit: b.unit,
      basePrice: b.base_price,
      description: b.description,
      imageUrl: b.image_url,
      skuTemplate: b.sku_template,
      isActive: b.is_active,
    };
  }
}
