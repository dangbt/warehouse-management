import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { PermissionsGuard, RequirePermissions } from '../../auth/permissions.guard';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller()
export class BatchesController {
  constructor(private prisma: PrismaService) {}

  @Get('batches')
  @RequirePermissions('ingredients:read')
  async findAll(@Query() q: { ingredientId?: string; page?: string; limit?: string }) {
    const page = +(q.page || 1),
      limit = +(q.limit || 20);
    const where = q.ingredientId ? { ingredientId: q.ingredientId } : {};
    const [data, total] = await Promise.all([
      this.prisma.ingredientBatch.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { receivedDate: 'desc' },
        include: { ingredient: true },
      }),
      this.prisma.ingredientBatch.count({ where }),
    ]);
    return { data, meta: { page, limit, total } };
  }

  @Get('reports/expiring')
  @RequirePermissions('ingredients:read')
  async expiring(@Query() q: { days?: string }) {
    const days = +(q.days || 7);
    const deadline = new Date();
    deadline.setDate(deadline.getDate() + days);

    const data = await this.prisma.ingredientBatch.findMany({
      where: {
        status: 'ACTIVE',
        quantity: { gt: 0 },
        expiryDate: { not: null, lte: deadline },
      },
      orderBy: { expiryDate: 'asc' },
      include: { ingredient: true },
    });
    return { data, meta: { days, deadline: deadline.toISOString() } };
  }
}
