import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class IngredientGroupsService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.ingredientGroup.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { ingredients: true } } },
    });
  }

  async create(body: { name: string; base_unit: string; min_stock?: number; note?: string }) {
    const exists = await this.prisma.ingredientGroup.findUnique({ where: { name: body.name } });
    if (exists) throw new ConflictException('Nhóm đã tồn tại');
    return this.prisma.ingredientGroup.create({
      data: {
        name: body.name,
        baseUnit: body.base_unit,
        minStock: body.min_stock ?? null,
        note: body.note,
      },
    });
  }

  async update(id: string, body: { name?: string; base_unit?: string; min_stock?: number | null; note?: string }) {
    const exists = await this.prisma.ingredientGroup.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Không tìm thấy nhóm');
    return this.prisma.ingredientGroup.update({
      where: { id },
      data: {
        name: body.name,
        baseUnit: body.base_unit,
        minStock: body.min_stock,
        note: body.note,
      },
    });
  }
}
