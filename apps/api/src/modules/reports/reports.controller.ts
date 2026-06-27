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
      include: { group: true },
    });
    const total = ingredients.length;
    const totalValue = ingredients.reduce((s, i) => s + Number(i.currentStock) * Number(i.costPerUnit), 0);
    const lowStock = ingredients.filter((i) => Number(i.currentStock) <= Number(i.minStock));

    // Gom nhóm: quy đổi tồn từng NL về base_unit của nhóm (current_stock × base_factor)
    type Member = {
      id: string;
      name: string;
      unit: string;
      currentStock: number;
      baseFactor: number;
      baseQty: number;
      value: number;
    };
    const groupMap = new Map<string, { id: string; name: string; baseUnit: string; minStock: number | null; items: Member[] }>();

    for (const i of ingredients) {
      if (!i.group) continue;
      const baseFactor = i.baseFactor != null ? Number(i.baseFactor) : 1;
      const stock = Number(i.currentStock);
      const member: Member = {
        id: i.id,
        name: i.name,
        unit: i.unit,
        currentStock: stock,
        baseFactor,
        baseQty: +(stock * baseFactor).toFixed(3),
        value: +(stock * Number(i.costPerUnit)).toFixed(2),
      };
      const g = groupMap.get(i.group.id);
      if (g) {
        g.items.push(member);
      } else {
        groupMap.set(i.group.id, {
          id: i.group.id,
          name: i.group.name,
          baseUnit: i.group.baseUnit,
          minStock: i.group.minStock != null ? Number(i.group.minStock) : null,
          items: [member],
        });
      }
    }

    const groups = Array.from(groupMap.values()).map((g) => {
      const totalStock = +g.items.reduce((s, m) => s + m.baseQty, 0).toFixed(3);
      const groupValue = +g.items.reduce((s, m) => s + m.value, 0).toFixed(2);
      return {
        ...g,
        totalStock,
        totalValue: groupValue,
        isLow: g.minStock != null && totalStock <= g.minStock,
      };
    });

    const ungrouped = ingredients.filter((i) => !i.groupId);

    return { total, totalValue, lowStock, groups, ungrouped, ingredients };
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
      const day = now.getDay() || 7;
      from = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day + 1);
    }

    const transactions = await this.prisma.stockTransaction.findMany({
      where: { createdAt: { gte: from, lte: to } },
      include: { ingredient: { select: { id: true, name: true, unit: true, currentStock: true } } },
    });

    const map = new Map<string, { id: string; name: string; unit: string; imported: number; exported: number; currentStock: number }>();
    for (const t of transactions) {
      const key = t.ingredientId;
      const existing = map.get(key);
      const qty = Math.abs(Number(t.quantity));
      if (!existing) {
        map.set(key, {
          id: t.ingredient.id,
          name: t.ingredient.name,
          unit: t.ingredient.unit,
          imported: 0,
          exported: 0,
          currentStock: Number(t.ingredient.currentStock),
        });
      }
      const entry = map.get(key)!;
      if (t.type === 'IMPORT') entry.imported += qty;
      else entry.exported += qty;
    }

    return {
      period: q.period || 'week',
      from: from.toISOString(),
      to: to.toISOString(),
      data: Array.from(map.values()).sort((a, b) => b.imported + b.exported - (a.imported + a.exported)),
    };
  }

  @Get('consumption-variance')
  async consumptionVariance(@Query() q: { from?: string; to?: string }) {
    const from = q.from ? new Date(q.from) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const to = q.to ? new Date(q.to) : new Date();

    // Theoretical usage from KiotViet orders matched to recipes
    const orders = await this.prisma.kiotVietOrder.findMany({
      where: { orderDate: { gte: from, lte: to }, deducted: true },
      include: { items: { include: { menuItem: { include: { recipe: { include: { ingredients: true } } } } } } },
    });

    const theoreticalMap = new Map<string, number>();
    for (const order of orders) {
      for (const item of order.items) {
        if (!item.menuItem?.recipe) continue;
        const recipe = item.menuItem.recipe;
        for (const ri of recipe.ingredients) {
          const usage = (Number(ri.quantity) * item.quantity) / recipe.servingSize;
          theoreticalMap.set(ri.ingredientId, (theoreticalMap.get(ri.ingredientId) || 0) + usage);
        }
      }
    }

    // Actual usage from stock transactions
    const transactions = await this.prisma.stockTransaction.findMany({
      where: {
        createdAt: { gte: from, lte: to },
        type: { in: ['ORDER_DEDUCT', 'EXPORT'] },
      },
    });

    const actualMap = new Map<string, number>();
    for (const t of transactions) {
      const qty = Math.abs(Number(t.quantity));
      actualMap.set(t.ingredientId, (actualMap.get(t.ingredientId) || 0) + qty);
    }

    // Combine
    const ingredientIds = [...new Set([...theoreticalMap.keys(), ...actualMap.keys()])];
    const ingredients = await this.prisma.ingredient.findMany({
      where: { id: { in: ingredientIds } },
      select: { id: true, name: true, unit: true },
    });
    const ingredientLookup = new Map(ingredients.map((i) => [i.id, i] as const));

    const data = ingredientIds.map((id) => {
      const theoretical = theoreticalMap.get(id) || 0;
      const actual = actualMap.get(id) || 0;
      const variance = actual - theoretical;
      const variancePercent = theoretical > 0 ? (variance / theoretical) * 100 : 0;
      const ing = ingredientLookup.get(id);
      return {
        ingredientId: id,
        name: ing?.name || '',
        unit: ing?.unit || '',
        theoreticalUsage: +theoretical.toFixed(3),
        actualUsage: +actual.toFixed(3),
        variance: +variance.toFixed(3),
        variancePercent: +variancePercent.toFixed(2),
      };
    });

    return { from: from.toISOString(), to: to.toISOString(), data: data.sort((a, b) => Math.abs(b.variance) - Math.abs(a.variance)) };
  }
}
