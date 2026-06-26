import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PurchaseReturnsService {
  constructor(private prisma: PrismaService) {}

  async findAll(q: { page?: string; limit?: string; supplierId?: string }) {
    const page = +(q.page || 1),
      limit = +(q.limit || 20);
    const where: { supplierId?: string } = q.supplierId ? { supplierId: q.supplierId } : {};
    const [data, total] = await Promise.all([
      this.prisma.purchaseReturn.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { supplier: true, createdBy: { select: { id: true, fullName: true } }, items: { include: { ingredient: true } } },
      }),
      this.prisma.purchaseReturn.count({ where }),
    ]);
    return { data, meta: { page, limit, total } };
  }

  async create(
    userId: string,
    body: {
      supplier_id: string;
      reason: string;
      note?: string;
      items: { ingredient_id: string; quantity: number; unit_price: number }[];
    },
  ) {
    if (!body.supplier_id || !body.items?.length || !body.reason) {
      throw new BadRequestException('Thiếu thông tin bắt buộc');
    }
    for (const item of body.items) {
      if (!item.ingredient_id || item.quantity <= 0 || item.unit_price < 0) {
        throw new BadRequestException('Dữ liệu item không hợp lệ');
      }
    }

    const code = `PTH-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String(Date.now()).slice(-4)}`;
    const totalAmount = body.items.reduce((s, i) => s + i.quantity * i.unit_price, 0);

    return this.prisma.$transaction(async (tx) => {
      const purchaseReturn = await tx.purchaseReturn.create({
        data: {
          code,
          supplierId: body.supplier_id,
          totalAmount,
          reason: body.reason,
          note: body.note,
          createdById: userId,
          items: {
            create: body.items.map((i) => ({
              ingredientId: i.ingredient_id,
              quantity: i.quantity,
              unitPrice: i.unit_price,
              totalPrice: i.quantity * i.unit_price,
            })),
          },
        },
        include: { items: true },
      });

      for (const item of body.items) {
        await tx.ingredient.update({
          where: { id: item.ingredient_id },
          data: { currentStock: { decrement: item.quantity } },
        });
        await tx.stockTransaction.create({
          data: {
            ingredientId: item.ingredient_id,
            type: 'RETURN',
            quantity: -item.quantity,
            unitPrice: item.unit_price,
            totalPrice: item.quantity * item.unit_price,
            referenceId: purchaseReturn.id,
            createdById: userId,
            note: `Trả hàng NCC: ${code}`,
          },
        });
      }

      await tx.supplier.update({
        where: { id: body.supplier_id },
        data: { totalDebt: { decrement: totalAmount } },
      });

      return purchaseReturn;
    });
  }
}
