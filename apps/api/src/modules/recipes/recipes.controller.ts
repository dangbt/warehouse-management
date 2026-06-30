import { Controller, Get, Post, Put, Param, Body, Query, UseGuards, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { PermissionsGuard, RequirePermissions } from '../../auth/permissions.guard';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('recipes')
export class RecipesController {
  constructor(private prisma: PrismaService) {}

  @Get()
  @RequirePermissions('recipes:read')
  async findAll(@Query() q: { page?: string; limit?: string; orderBy?: string; sort?: string }) {
    const page = Math.max(1, +(q.page || 1)),
      limit = Math.min(100, Math.max(1, +(q.limit || 20)));

    const sortField = q.orderBy || 'name';
    const sortDir = q.sort === 'desc' ? 'desc' : 'asc';

    const [data, total] = await Promise.all([
      this.prisma.recipe.findMany({
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { [sortField]: sortDir },
        include: {
          menuItem: true,
          ingredients: { include: { ingredient: true } },
        },
      }),
      this.prisma.recipe.count(),
    ]);
    return { data, meta: { page, limit, total } };
  }

  @Post()
  @RequirePermissions('recipes:create')
  create(
    @Body()
    body: {
      menu_item_id: string;
      name: string;
      serving_size: number;
      ingredients: { ingredient_id: string; quantity: number; unit: string }[];
    },
  ) {
    return this.prisma.recipe.create({
      data: {
        menuItemId: body.menu_item_id,
        name: body.name,
        servingSize: body.serving_size,
        ingredients: {
          create: body.ingredients.map((i) => ({
            ingredientId: i.ingredient_id,
            quantity: i.quantity,
            unit: i.unit,
          })),
        },
      },
      include: { ingredients: true },
    });
  }

  @Put(':id')
  @RequirePermissions('recipes:update')
  async update(
    @Param('id') id: string,
    @Body()
    body: {
      name?: string;
      serving_size?: number;
      ingredients?: { ingredient_id: string; quantity: number; unit: string }[];
    },
  ) {
    const exists = await this.prisma.recipe.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Công thức không tồn tại');

    if (body.ingredients) {
      return this.prisma.$transaction(async (tx) => {
        await tx.recipeIngredient.deleteMany({ where: { recipeId: id } });
        return tx.recipe.update({
          where: { id },
          data: {
            name: body.name,
            servingSize: body.serving_size,
            ingredients: {
              create: body.ingredients!.map((i) => ({
                ingredientId: i.ingredient_id,
                quantity: i.quantity,
                unit: i.unit,
              })),
            },
          },
          include: { ingredients: true },
        });
      });
    }

    return this.prisma.recipe.update({
      where: { id },
      data: { name: body.name, servingSize: body.serving_size },
      include: { ingredients: true },
    });
  }
}
