import { Controller, Get, UseGuards } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('reports')
export class ReportsController {
  constructor(private prisma: PrismaService) {}

  @Get('stock-summary')
  async stockSummary() {
    const ingredients = await this.prisma.ingredient.findMany({
      orderBy: { name: 'asc' },
    });
    const total = ingredients.length;
    const totalValue = ingredients.reduce((s, i) => s + Number(i.currentStock) * Number(i.costPerUnit), 0);
    const lowStock = ingredients.filter((i) => Number(i.currentStock) <= Number(i.minStock));
    return { total, totalValue, lowStock, ingredients };
  }

  @Get('stock-movement')
  async stockMovement() {
    const transactions = await this.prisma.stockTransaction.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: { ingredient: true, createdBy: { select: { fullName: true } } },
    });
    return transactions;
  }
}
