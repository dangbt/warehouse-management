import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

type UnitInput = { unit_name: string; factor: number; is_default_buy?: boolean };

type IngredientBody = {
  name?: string;
  unit?: string;
  category?: string;
  cost_per_unit?: number;
  min_stock?: number;
  track_stock?: boolean;
  group_id?: string | null;
  base_factor?: number | null;
  source_ingredient_id?: string | null;
  yield_ratio?: number | null;
  loss_ratio?: number | null;
  units?: UnitInput[];
};

@Injectable()
export class IngredientsService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: { page?: string; limit?: string; category?: string; low_stock?: string; search?: string }) {
    const page = Math.max(1, +(query.page || 1));
    // Cho phép limit lớn để form/dropdown lấy toàn bộ NL (vd chọn nguồn cho BTP)
    const limit = Math.min(1000, Math.max(1, +(query.limit || 20)));
    const where: Record<string, unknown> = {};
    if (query.category) where.category = query.category;
    if (query.search) where.name = { contains: query.search, mode: 'insensitive' };

    const [data, total] = await Promise.all([
      this.prisma.ingredient.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { name: 'asc' },
        include: {
          group: true,
          units: true,
          source: { select: { id: true, name: true } },
        },
      }),
      this.prisma.ingredient.count({ where }),
    ]);

    const result = query.low_stock === 'true' ? data.filter((i) => Number(i.currentStock) <= Number(i.minStock)) : data;

    return { data: result, meta: { page, limit, total } };
  }

  async create(body: IngredientBody & { name: string; unit: string; category: string; cost_per_unit: number; min_stock: number }) {
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
        trackStock: body.track_stock ?? true,
        groupId: body.group_id ?? null,
        baseFactor: body.base_factor ?? null,
        sourceIngredientId: body.source_ingredient_id ?? null,
        yieldRatio: body.yield_ratio ?? null,
        lossRatio: body.loss_ratio ?? null,
        units: body.units?.length
          ? {
              create: body.units.map((u) => ({
                unitName: u.unit_name,
                factor: u.factor,
                isDefaultBuy: u.is_default_buy ?? false,
              })),
            }
          : undefined,
      },
      include: { group: true, units: true },
    });
  }

  async update(id: string, body: IngredientBody) {
    const exists = await this.prisma.ingredient.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Nguyên liệu không tồn tại');

    // Thay toàn bộ ĐVT phụ nếu client gửi mảng units
    if (body.units) {
      await this.prisma.ingredientUnit.deleteMany({ where: { ingredientId: id } });
      if (body.units.length) {
        await this.prisma.ingredientUnit.createMany({
          data: body.units.map((u) => ({
            ingredientId: id,
            unitName: u.unit_name,
            factor: u.factor,
            isDefaultBuy: u.is_default_buy ?? false,
          })),
        });
      }
    }

    return this.prisma.ingredient.update({
      where: { id },
      data: {
        name: body.name,
        unit: body.unit,
        category: body.category,
        costPerUnit: body.cost_per_unit,
        minStock: body.min_stock,
        trackStock: body.track_stock,
        groupId: body.group_id,
        baseFactor: body.base_factor,
        sourceIngredientId: body.source_ingredient_id,
        yieldRatio: body.yield_ratio,
        lossRatio: body.loss_ratio,
      },
      include: { group: true, units: true },
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
