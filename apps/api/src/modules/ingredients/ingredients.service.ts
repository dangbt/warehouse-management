import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class IngredientsService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: { page?: string; limit?: string; category?: string; low_stock?: string; search?: string }) {
    const page = Math.max(1, +(query.page || 1));
    const limit = Math.min(50, Math.max(1, +(query.limit || 20)));
    const where: Record<string, unknown> = {};
    if (query.category) where.category = query.category;
    if (query.search) where.name = { contains: query.search, mode: 'insensitive' };

    const [data, total] = await Promise.all([
      this.prisma.ingredient.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { name: 'asc' },
      }),
      this.prisma.ingredient.count({ where }),
    ]);

    const result = query.low_stock === 'true' ? data.filter((i) => Number(i.currentStock) <= Number(i.minStock)) : data;

    return { data: result, meta: { page, limit, total } };
  }

  async create(body: { name: string; unit: string; category: string; cost_per_unit: number; min_stock: number }) {
    const exists = await this.prisma.ingredient.findUnique({
      where: { name: body.name },
    });
    if (exists) throw new ConflictException('Nguyên liệu đã tồn tại');
    return this.prisma.ingredient.create({
      data: {
        name: body.name,
        unit: body.unit,
        category: body.category,
        costPerUnit: body.cost_per_unit,
        minStock: body.min_stock,
      },
    });
  }

  async update(
    id: string,
    body: {
      name?: string;
      unit?: string;
      category?: string;
      cost_per_unit?: number;
      min_stock?: number;
    },
  ) {
    const exists = await this.prisma.ingredient.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Nguyên liệu không tồn tại');
    return this.prisma.ingredient.update({
      where: { id },
      data: {
        name: body.name,
        unit: body.unit,
        category: body.category,
        costPerUnit: body.cost_per_unit,
        minStock: body.min_stock,
      },
    });
  }

  async remove(id: string) {
    const inRecipe = await this.prisma.recipeIngredient.findFirst({
      where: { ingredientId: id },
    });
    if (inRecipe) throw new ConflictException('Nguyên liệu đang được sử dụng trong công thức');
    return this.prisma.ingredient.delete({ where: { id } });
  }
}
