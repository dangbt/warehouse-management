import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ImportOrdersService {
  constructor(private prisma: PrismaService) {}

  async findAll(q: { page?: string; limit?: string; status?: string }) {
    const page = +(q.page || 1),
      limit = +(q.limit || 20);
    const where: { status?: string } = q.status ? { status: q.status } : {};
    const [data, total] = await Promise.all([
      this.prisma.importOrder.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { supplier: true, items: { include: { ingredient: true } } },
      }),
      this.prisma.importOrder.count({ where }),
    ]);
    return { data, meta: { page, limit, total } };
  }

  async create(
    userId: string,
    body: {
      supplier_id: string;
      note?: string;
      paid?: boolean;
      items: {
        ingredient_id: string;
        quantity: number;
        unit_price: number;
        expiry_date?: string;
      }[];
    },
  ) {
    if (!body.supplier_id || !body.items?.length) throw new BadRequestException('Thiếu nhà cung cấp hoặc danh sách hàng');
    for (const item of body.items) {
      if (!item.ingredient_id || item.quantity <= 0 || item.unit_price < 0) throw new BadRequestException('Dữ liệu item không hợp lệ');
    }

    const code = `PN-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String(Date.now()).slice(-4)}`;
    const totalAmount = body.items.reduce((s, i) => s + i.quantity * i.unit_price, 0);

    return this.prisma.importOrder.create({
      data: {
        code,
        supplierId: body.supplier_id,
        totalAmount,
        paid: body.paid ?? false,
        note: body.note,
        createdById: userId,
        items: {
          create: body.items.map((i) => ({
            ingredientId: i.ingredient_id,
            quantity: i.quantity,
            unitPrice: i.unit_price,
            totalPrice: i.quantity * i.unit_price,
            expiryDate: i.expiry_date ? new Date(i.expiry_date) : null,
          })),
        },
      },
      include: { items: true },
    });
  }

  async approve(id: string, approvedById: string) {
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.importOrder.findUnique({
        where: { id },
        include: { items: true },
      });
      if (!order || order.status !== 'PENDING') throw new BadRequestException('Chỉ duyệt phiếu PENDING');

      await tx.importOrder.update({
        where: { id },
        data: { status: 'COMPLETED', approvedById },
      });
      if (!order.paid) {
        await tx.supplier.update({
          where: { id: order.supplierId },
          data: { totalDebt: { increment: order.totalAmount } },
        });
      }
      for (const item of order.items) {
        await tx.ingredient.update({
          where: { id: item.ingredientId },
          data: { currentStock: { increment: item.quantity } },
        });
        await tx.stockTransaction.create({
          data: {
            ingredientId: item.ingredientId,
            type: 'IMPORT',
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice,
            referenceId: order.id,
            createdById: approvedById,
            note: `Nhập kho: ${order.code}`,
          },
        });
        await tx.ingredientBatch.create({
          data: {
            ingredientId: item.ingredientId,
            importOrderItemId: item.id,
            batchCode: `${order.code}-${item.id.slice(0, 4)}`,
            quantity: item.quantity,
            costPerUnit: item.unitPrice,
            expiryDate: item.expiryDate,
            receivedDate: new Date(),
          },
        });
      }
      return { message: 'Đã duyệt phiếu nhập' };
    });
  }

  async reject(id: string, reason?: string) {
    const order = await this.prisma.importOrder.findUnique({ where: { id } });
    if (!order || order.status !== 'PENDING') throw new BadRequestException('Chỉ từ chối phiếu PENDING');
    await this.prisma.importOrder.update({
      where: { id },
      data: { status: 'REJECTED', note: reason || order.note },
    });
    return { message: 'Đã từ chối phiếu nhập' };
  }
}
