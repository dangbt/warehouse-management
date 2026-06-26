import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class StocktakeService {
  constructor(private prisma: PrismaService) {}

  async findAll(q: { page?: string; limit?: string }) {
    const page = +(q.page || 1),
      limit = +(q.limit || 20);
    const [data, total] = await Promise.all([
      this.prisma.stocktakeSession.findMany({
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { createdBy: { select: { id: true, fullName: true } }, _count: { select: { items: true } } },
      }),
      this.prisma.stocktakeSession.count(),
    ]);
    return { data, meta: { page, limit, total } };
  }

  async getDetail(id: string) {
    const session = await this.prisma.stocktakeSession.findUnique({
      where: { id },
      include: {
        createdBy: { select: { id: true, fullName: true } },
        items: { include: { ingredient: { select: { id: true, name: true, unit: true } } } },
      },
    });
    if (!session) throw new NotFoundException('Không tìm thấy phiên kiểm kho');
    return session;
  }

  async create(userId: string, body: { note?: string }) {
    const ingredients = await this.prisma.ingredient.findMany({
      select: { id: true, currentStock: true },
    });

    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const count = await this.prisma.stocktakeSession.count({
      where: { code: { startsWith: `ST-${today}` } },
    });
    const code = `ST-${today}-${String(count + 1).padStart(3, '0')}`;

    return this.prisma.stocktakeSession.create({
      data: {
        code,
        note: body.note,
        createdById: userId,
        items: {
          create: ingredients.map((ing) => ({
            ingredientId: ing.id,
            systemQty: ing.currentStock,
            actualQty: ing.currentStock,
            difference: 0,
          })),
        },
      },
      include: { items: true },
    });
  }

  async updateItems(id: string, body: { items: { ingredientId: string; actualQty: number; note?: string }[] }) {
    const session = await this.prisma.stocktakeSession.findUnique({ where: { id } });
    if (!session) throw new NotFoundException('Không tìm thấy phiên kiểm kho');
    if (session.status !== 'DRAFT') throw new BadRequestException('Chỉ cập nhật phiên ở trạng thái DRAFT');

    for (const item of body.items) {
      const existing = await this.prisma.stocktakeItem.findFirst({
        where: { sessionId: id, ingredientId: item.ingredientId },
      });
      if (!existing) continue;

      const difference = new Decimal(item.actualQty).minus(existing.systemQty);
      await this.prisma.stocktakeItem.update({
        where: { id: existing.id },
        data: { actualQty: item.actualQty, difference, note: item.note },
      });
    }

    return { message: 'Cập nhật thành công' };
  }

  async complete(id: string, userId: string) {
    const session = await this.prisma.stocktakeSession.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!session) throw new NotFoundException('Không tìm thấy phiên kiểm kho');
    if (session.status !== 'DRAFT') throw new BadRequestException('Phiên đã hoàn thành');

    await this.prisma.$transaction(async (tx) => {
      for (const item of session.items) {
        const diff = Number(item.difference);
        if (diff === 0) continue;

        await tx.ingredient.update({
          where: { id: item.ingredientId },
          data: { currentStock: item.actualQty },
        });

        await tx.stockTransaction.create({
          data: {
            ingredientId: item.ingredientId,
            type: 'STOCKTAKE_ADJUST',
            quantity: item.difference,
            referenceId: session.id,
            createdById: userId,
            note: `Kiểm kho: ${session.code}`,
          },
        });

        // Adjust batches: add to or deduct from latest batch
        if (diff > 0) {
          const latestBatch = await tx.ingredientBatch.findFirst({
            where: { ingredientId: item.ingredientId, status: 'ACTIVE' },
            orderBy: { receivedDate: 'desc' },
          });
          if (latestBatch) {
            await tx.ingredientBatch.update({
              where: { id: latestBatch.id },
              data: { quantity: { increment: diff } },
            });
          }
        } else {
          // diff < 0, deduct from latest batch (LIFO for adjustment)
          const deductQty = Math.abs(diff);
          let remaining = deductQty;
          const batches = await tx.ingredientBatch.findMany({
            where: { ingredientId: item.ingredientId, status: 'ACTIVE', quantity: { gt: 0 } },
            orderBy: { receivedDate: 'desc' },
          });

          for (const batch of batches) {
            if (remaining <= 0) break;
            const available = Number(batch.quantity);
            const deduct = Math.min(available, remaining);
            await tx.ingredientBatch.update({
              where: { id: batch.id },
              data: {
                quantity: { decrement: deduct },
                status: available - deduct <= 0 ? 'DEPLETED' : 'ACTIVE',
              },
            });
            remaining -= deduct;
          }
        }
      }

      await tx.stocktakeSession.update({
        where: { id },
        data: { status: 'COMPLETED', completedAt: new Date() },
      });
    });

    return { message: 'Hoàn thành kiểm kho' };
  }
}
