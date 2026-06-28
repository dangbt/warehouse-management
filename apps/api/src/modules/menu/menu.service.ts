import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

type MenuBody = {
  name?: string;
  price?: number;
  category?: string;
  kiotviet_product_id?: string | null;
  inventory_mode?: 'RECIPE' | 'DIRECT' | 'NONE' | null;
  direct_ingredient_id?: string | null;
  is_active?: boolean;
};

@Injectable()
export class MenuService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.menuItem.findMany({
      orderBy: { name: 'asc' },
      include: {
        directIngredient: { select: { id: true, name: true, unit: true } },
        recipe: { include: { _count: { select: { ingredients: true } } } },
      },
    });
  }

  create(body: MenuBody & { name: string; price: number; category: string }) {
    return this.prisma.menuItem.create({
      data: {
        name: body.name,
        price: body.price,
        category: body.category,
        kiotvietProductId: body.kiotviet_product_id ?? null,
        inventoryMode: body.inventory_mode ?? null,
        directIngredientId: body.inventory_mode === 'DIRECT' ? (body.direct_ingredient_id ?? null) : null,
      },
    });
  }

  async update(id: string, body: MenuBody) {
    const exists = await this.prisma.menuItem.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Không tìm thấy món');
    // Nếu chuyển mode khác DIRECT thì bỏ liên kết NL trực tiếp
    const directId = body.inventory_mode !== undefined && body.inventory_mode !== 'DIRECT' ? null : body.direct_ingredient_id;
    return this.prisma.menuItem.update({
      where: { id },
      data: {
        name: body.name,
        price: body.price,
        category: body.category,
        kiotvietProductId: body.kiotviet_product_id,
        inventoryMode: body.inventory_mode,
        directIngredientId: directId,
        isActive: body.is_active,
      },
    });
  }
}
