import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BatchDeductionService } from '../common/batch-deduction.service';

@Injectable()
export class ProcessingService {
  constructor(
    private prisma: PrismaService,
    private batchDeduction: BatchDeductionService,
  ) {}

  async findAll(q: { page?: string; limit?: string; status?: string; orderBy?: string; sort?: string }) {
    const page = +(q.page || 1);
    const limit = +(q.limit || 20);
    const where: { status?: string } = q.status ? { status: q.status } : {};

    const sortField = q.orderBy || 'createdAt';
    const sortDir = q.sort === 'asc' ? 'asc' : 'desc';

    const [data, total] = await Promise.all([
      this.prisma.processingOrder.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { [sortField]: sortDir },
        include: {
          source: { select: { id: true, name: true, unit: true } },
          output: { select: { id: true, name: true, unit: true } },
          createdBy: { select: { id: true, fullName: true } },
        },
      }),
      this.prisma.processingOrder.count({ where }),
    ]);
    return { data, meta: { page, limit, total } };
  }

  async getDetail(id: string) {
    const order = await this.prisma.processingOrder.findUnique({
      where: { id },
      include: {
        source: { select: { id: true, name: true, unit: true, currentStock: true, costPerUnit: true } },
        output: { select: { id: true, name: true, unit: true, currentStock: true } },
        createdBy: { select: { id: true, fullName: true } },
      },
    });
    if (!order) throw new NotFoundException('Không tìm thấy phiếu chế biến');
    return order;
  }

  async create(
    userId: string,
    body: { source_ingredient_id: string; source_qty: number; output_ingredient_id: string; output_qty?: number; note?: string },
  ) {
    if (!body.source_ingredient_id || !body.output_ingredient_id) throw new BadRequestException('Thiếu nguyên liệu nguồn hoặc thành phẩm');
    if (body.source_ingredient_id === body.output_ingredient_id) throw new BadRequestException('Nguồn và thành phẩm phải khác nhau');
    if (!body.source_qty || body.source_qty <= 0) throw new BadRequestException('Lượng nguyên liệu nguồn phải > 0');

    const [source, output] = await Promise.all([
      this.prisma.ingredient.findUnique({ where: { id: body.source_ingredient_id } }),
      this.prisma.ingredient.findUnique({ where: { id: body.output_ingredient_id } }),
    ]);
    if (!source) throw new BadRequestException('Nguyên liệu nguồn không tồn tại');
    if (!output) throw new BadRequestException('Thành phẩm không tồn tại');

    // Định mức quy đổi mặc định (yield) lấy từ thành phẩm; gợi ý lượng thu dự kiến
    const ratio = output.yieldRatio != null ? Number(output.yieldRatio) : null;
    const expectedQty = ratio != null ? +(body.source_qty * ratio).toFixed(3) : (body.output_qty ?? body.source_qty);
    const outputQty = body.output_qty != null ? body.output_qty : expectedQty;
    if (outputQty <= 0) throw new BadRequestException('Lượng thành phẩm thực thu phải > 0');

    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const count = await this.prisma.processingOrder.count({ where: { code: { startsWith: `CB-${today}` } } });
    const code = `CB-${today}-${String(count + 1).padStart(3, '0')}`;

    return this.prisma.processingOrder.create({
      data: {
        code,
        sourceIngredientId: body.source_ingredient_id,
        sourceQty: body.source_qty,
        outputIngredientId: body.output_ingredient_id,
        expectedQty,
        outputQty,
        note: body.note,
        createdById: userId,
      },
    });
  }

  async complete(id: string, userId: string) {
    const order = await this.prisma.processingOrder.findUnique({ where: { id } });
    if (!order) throw new NotFoundException('Không tìm thấy phiếu chế biến');
    if (order.status !== 'DRAFT') throw new BadRequestException('Chỉ hoàn thành phiếu ở trạng thái DRAFT');

    const source = await this.prisma.ingredient.findUnique({ where: { id: order.sourceIngredientId } });
    if (!source) throw new BadRequestException('Nguyên liệu nguồn không tồn tại');
    const sourceQty = Number(order.sourceQty);
    const outputQty = Number(order.outputQty);
    if (Number(source.currentStock) < sourceQty) throw new BadRequestException('Không đủ tồn nguyên liệu nguồn');

    // Giá vốn chuyển sang thành phẩm: hao hụt tự đẩy giá vốn/đơn vị lên
    const sourceCost = Number(source.costPerUnit);
    const movedValue = +(sourceQty * sourceCost).toFixed(2);
    const outputCost = +(movedValue / outputQty).toFixed(2);

    await this.prisma.$transaction(async (tx) => {
      // 1. Trừ nguồn theo lô (FIFO) + trừ tồn
      await this.batchDeduction.deductFromBatches(tx, order.sourceIngredientId, sourceQty);
      await tx.ingredient.update({
        where: { id: order.sourceIngredientId },
        data: { currentStock: { decrement: sourceQty } },
      });
      await tx.stockTransaction.create({
        data: {
          ingredientId: order.sourceIngredientId,
          type: 'PROCESS_OUT',
          quantity: -sourceQty,
          unitPrice: sourceCost,
          totalPrice: -movedValue,
          referenceId: order.code,
          createdById: userId,
          note: `Chế biến: ${order.code}`,
        },
      });

      // 2. Cộng thành phẩm + cập nhật giá vốn theo mẻ này
      await tx.ingredient.update({
        where: { id: order.outputIngredientId },
        data: { currentStock: { increment: outputQty }, costPerUnit: outputCost },
      });
      await tx.stockTransaction.create({
        data: {
          ingredientId: order.outputIngredientId,
          type: 'PROCESS_IN',
          quantity: outputQty,
          unitPrice: outputCost,
          totalPrice: movedValue,
          referenceId: order.code,
          createdById: userId,
          note: `Chế biến: ${order.code}`,
        },
      });

      await tx.processingOrder.update({
        where: { id },
        data: { status: 'COMPLETED', completedAt: new Date() },
      });
    });

    return { message: 'Hoàn thành chế biến', outputCost };
  }
}
