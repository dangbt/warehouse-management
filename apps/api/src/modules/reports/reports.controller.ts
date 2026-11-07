import { BadRequestException, Controller, Get, NotFoundException, Query, UseGuards } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { resolveReportRange } from './report-range';
import { InventorySummaryRepository } from './inventory-summary.repository';
import { buildInventorySummary } from './inventory-summary';
import { FeatureGuard, RequireFeature } from '../settings/feature.guard';
import { SettingsService } from '../settings/settings.service';
import { buildInventorySummaryByProduct } from './inventory-summary-by-product';
import { ProductReportsRepository } from './product-reports.repository';
import { buildStockMatrixReport, groupLowStockByProduct } from './stock-matrix';
import { StockCardRepository } from './stock-card.repository';
import { buildStockCard } from './stock-card';
import { withWarehouseStock } from '../common/warehouse-stock-view';

@UseGuards(JwtAuthGuard)
@Controller('reports')
export class ReportsController {
  constructor(
    private prisma: PrismaService,
    private inventorySummaryRepo: InventorySummaryRepository,
    private stockCardRepo: StockCardRepository,
    private productReports: ProductReportsRepository,
    private settings: SettingsService,
  ) {}

  /** Tổng hợp Nhập – Xuất – Tồn theo kỳ (ngày chứng từ), lọc theo nhóm NL. */
  @Get('inventory-summary')
  async inventorySummary(
    @Query()
    q: {
      from?: string;
      to?: string;
      group_id?: string;
      group_by?: string;
      category?: string;
      attribute_value_id?: string;
      warehouse_id?: string;
    },
  ) {
    if (!q.from || !q.to) throw new BadRequestException('Thiếu from/to');
    const { from, to } = resolveReportRange({ from: q.from, to: q.to });
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from > to) {
      throw new BadRequestException('Khoảng thời gian không hợp lệ');
    }
    // Lọc danh mục/thuộc tính + gộp theo SP chỉ có tác dụng khi flag product_variants bật (FNB không đổi)
    const variants = (await this.settings.getFeatures()).flags.product_variants;
    const raw = await this.inventorySummaryRepo.aggregate(from, to, {
      groupId: q.group_id || undefined,
      category: variants ? q.category || undefined : undefined,
      attributeValueId: variants ? q.attribute_value_id || undefined : undefined,
      warehouseId: q.warehouse_id || undefined,
    });
    return variants && q.group_by === 'product'
      ? buildInventorySummaryByProduct(raw, q.from, q.to)
      : buildInventorySummary(raw, q.from, q.to);
  }

  /** Ma trận tồn size × màu theo sản phẩm hoặc danh mục (WMS-22). */
  @Get('stock-matrix')
  @UseGuards(FeatureGuard)
  @RequireFeature('product_variants')
  async stockMatrix(@Query() q: { product_id?: string; category?: string }) {
    const inputs = await this.productReports.matrixInputs({ productId: q.product_id || undefined, category: q.category || undefined });
    return buildStockMatrixReport(inputs);
  }

  /** Thẻ kho / Sổ chi tiết vật tư của 1 NL trong kỳ (ngày chứng từ): đầu kỳ, giao dịch, phát sinh, cuối kỳ. */
  @Get('stock-card')
  async stockCard(@Query() q: { ingredient_id?: string; from?: string; to?: string; warehouse_id?: string }) {
    if (!q.ingredient_id || !q.from || !q.to) throw new BadRequestException('Thiếu ingredient_id/from/to');
    const { from, to } = resolveReportRange({ from: q.from, to: q.to });
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from > to) {
      throw new BadRequestException('Khoảng thời gian không hợp lệ');
    }
    const wh = q.warehouse_id || undefined;
    const ing = await this.stockCardRepo.findIngredient(q.ingredient_id);
    if (!ing) throw new NotFoundException('Không tìm thấy nguyên liệu');
    const [opening, txs] = await Promise.all([
      this.stockCardRepo.opening(ing.id, from, wh),
      this.stockCardRepo.transactions(ing.id, from, to, wh),
    ]);
    const ingredient = { id: ing.id, code: ing.id.slice(0, 8).toUpperCase(), name: ing.name, unit: ing.unit };
    return buildStockCard(ingredient, opening, txs, q.from, q.to);
  }

  @Get('stock-summary')
  async stockSummary(@Query() q: { warehouse_id?: string }) {
    const all = await this.prisma.ingredient.findMany({
      orderBy: { name: 'asc' },
      include: { group: true },
    });
    // Lọc theo kho: currentStock của từng NL được thay bằng tồn tại kho đó.
    const ingredients = q.warehouse_id ? await withWarehouseStock(this.prisma, all, q.warehouse_id) : all;
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

    // Flag product_variants bật: tồn thấp của biến thể gom theo SP (dashboard). Tắt → không có field, FNB giữ nguyên.
    const lowStockProducts = (await this.settings.getFeatures()).flags.product_variants
      ? groupLowStockByProduct(await this.productReports.lowStockVariants())
      : undefined;

    return { total, totalValue, lowStock, lowStockProducts, groups, ungrouped, ingredients };
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
    const { from, to } = resolveReportRange(q);

    const transactions = await this.prisma.stockTransaction.findMany({
      where: { voucherDate: { gte: from, lte: to } },
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
    const { from, to } = resolveReportRange({ from: q.from, to: q.to, period: 'month' });

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
        voucherDate: { gte: from, lte: to },
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
