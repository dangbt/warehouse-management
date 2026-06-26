import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

interface KiotVietOrderInput {
  id: string;
  code: string;
  customerName?: string;
  totalAmount: number;
  orderDate: string;
  items: { productName: string; quantity: number; price: number }[];
}

@Injectable()
export class KiotVietService {
  constructor(private prisma: PrismaService) {}

  async syncOrders(orders: KiotVietOrderInput[]) {
    const results = { synced: 0, skipped: 0, errors: [] as string[] };

    for (const order of orders) {
      const exists = await this.prisma.kiotVietOrder.findUnique({ where: { kiotVietId: order.id } });
      if (exists) {
        results.skipped++;
        continue;
      }

      // Match items to menu items by name
      const menuItems = await this.prisma.menuItem.findMany();
      const itemsData = order.items.map((item) => {
        const matched = menuItems.find((m) => m.name.toLowerCase() === item.productName.toLowerCase());
        return { productName: item.productName, menuItemId: matched?.id || null, quantity: item.quantity, price: item.price };
      });

      await this.prisma.kiotVietOrder.create({
        data: {
          kiotVietId: order.id,
          code: order.code,
          customerName: order.customerName,
          totalAmount: order.totalAmount,
          orderDate: new Date(order.orderDate),
          items: { create: itemsData },
        },
      });
      results.synced++;
    }

    return results;
  }

  async deductOrder(orderId: string, userId: string) {
    const order = await this.prisma.kiotVietOrder.findUnique({
      where: { id: orderId },
      include: { items: { include: { menuItem: { include: { recipe: { include: { ingredients: true } } } } } } },
    });

    if (!order) throw new BadRequestException('Đơn hàng không tồn tại');
    if (order.deducted) throw new BadRequestException('Đơn hàng đã được trừ kho');

    // Collect all ingredients to deduct
    const deductions: { ingredientId: string; quantity: number }[] = [];

    for (const item of order.items) {
      if (!item.menuItem?.recipe) continue;
      const recipe = item.menuItem.recipe;
      for (const ri of recipe.ingredients) {
        const qty = Number(ri.quantity) * item.quantity / recipe.servingSize;
        const existing = deductions.find((d) => d.ingredientId === ri.ingredientId);
        if (existing) existing.quantity += qty;
        else deductions.push({ ingredientId: ri.ingredientId, quantity: qty });
      }
    }

    if (deductions.length === 0) throw new BadRequestException('Không có nguyên liệu nào để trừ (kiểm tra công thức)');

    // Execute deduction in transaction
    await this.prisma.$transaction(async (tx) => {
      for (const d of deductions) {
        await tx.ingredient.update({ where: { id: d.ingredientId }, data: { currentStock: { decrement: d.quantity } } });
        await tx.stockTransaction.create({
          data: {
            ingredientId: d.ingredientId,
            type: 'ORDER_DEDUCT',
            quantity: -d.quantity,
            referenceId: order.id,
            note: `Trừ kho từ đơn KiotViet ${order.code}`,
            createdById: userId,
          },
        });
      }
      await tx.kiotVietOrder.update({ where: { id: orderId }, data: { deducted: true } });
    });

    return { message: `Đã trừ kho cho đơn ${order.code}`, deductions: deductions.length };
  }

  async getOrders(query: { page?: string; limit?: string; deducted?: string }) {
    const page = Math.max(1, +(query.page || 1));
    const limit = Math.min(100, Math.max(1, +(query.limit || 20)));
    const where = query.deducted !== undefined ? { deducted: query.deducted === 'true' } : {};

    const [data, total] = await Promise.all([
      this.prisma.kiotVietOrder.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { orderDate: 'desc' },
        include: { items: { include: { menuItem: true } } },
      }),
      this.prisma.kiotVietOrder.count({ where }),
    ]);

    return { data, meta: { page, limit, total } };
  }
}
