import { Controller, Get, Query, UseGuards } from '@nestjs/common';
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

  @Get('ingredient-usage')
  async ingredientUsage(@Query() q: { period?: string; from?: string; to?: string }) {
    const now = new Date();
    let from: Date;
    let to: Date = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    if (q.from && q.to) {
      from = new Date(q.from);
      to = new Date(q.to);
    } else if (q.period === 'month') {
      from = new Date(now.getFullYear(), now.getMonth(), 1);
    } else {
      // default: this week (Monday)
      const day = now.getDay() || 7;
      from = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day + 1);
    }

    const transactions = await this.prisma.stockTransaction.findMany({
      where: {
        type: { in: ['ORDER_DEDUCT', 'EXPORT'] },
        createdAt: { gte: from, lte: to },
      },
      include: { ingredient: { select: { id: true, name: true, unit: true } } },
    });

    // Aggregate by ingredient
    const usageMap = new Map<string, { id: string; name: string; unit: string; total: number }>();
    for (const t of transactions) {
      const key = t.ingredientId;
      const existing = usageMap.get(key);
      const qty = Math.abs(Number(t.quantity));
      if (existing) {
        existing.total += qty;
      } else {
        usageMap.set(key, { id: t.ingredient.id, name: t.ingredient.name, unit: t.ingredient.unit, total: qty });
      }
    }

    return {
      period: q.period || 'week',
      from: from.toISOString(),
      to: to.toISOString(),
      data: Array.from(usageMap.values()).sort((a, b) => b.total - a.total),
    };
  }
}
