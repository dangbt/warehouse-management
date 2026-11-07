import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CostingService } from '../costing/costing.service';
import { voucherDateFilter, toNum } from '../common/voucher-date-filter';
import { VoucherService, parseVoucherDate } from '../common/voucher.service';
import { PeriodLockService } from '../common/period-lock.service';
import { WarehouseStockService } from '../common/warehouse-stock.service';
import { BatchDeductionService } from '../common/batch-deduction.service';

@Injectable()
export class ProcessingService {
  constructor(
    private prisma: PrismaService,
    private batchDeduction: BatchDeductionService,
    private stock: WarehouseStockService,
    private vouchers: VoucherService,
    private costing: CostingService,
    private periodLock: PeriodLockService,
  ) {}

  async findAll(q: {
    page?: string;
    limit?: string;
    status?: string;
    orderBy?: string;
    sort?: string;
    id?: string;
    from?: string;
    to?: string;
  }) {
    const page = +(q.page || 1);
    const limit = +(q.limit || 20);
    const where: { status?: string; id?: string; voucherDate?: { gte?: Date; lte?: Date } } = q.status ? { status: q.status } : {};
    if (q.id) where.id = q.id;
    const dateRange = voucherDateFilter(q);
    if (dateRange) where.voucherDate = dateRange;

    const sortField = q.orderBy || 'voucherDate';
    const sortDir = q.sort === 'asc' ? 'asc' : 'desc';

    const [data, total, agg] = await Promise.all([
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
      this.prisma.processingOrder.aggregate({ where, _sum: { sourceQty: true, outputQty: true } }),
    ]);
    const totals = { sourceQty: toNum(agg._sum.sourceQty), outputQty: toNum(agg._sum.outputQty) };
    return { data, meta: { page, limit, total, totals } };
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
    body: {
      source_ingredient_id: string;
      source_qty: number;
      output_ingredient_id: string;
      output_qty?: number;
      note?: string;
      voucher_date?: string;
      voucher_no?: string;
      // Kho chế biến (nguồn trừ + thành phẩm nhập cùng kho). Bỏ trống ⇒ kho mặc định.
      warehouse_id?: string;
    },
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

    const voucherDate = parseVoucherDate(body.voucher_date);
    await this.periodLock.assertOpen(voucherDate);
    const voucherNo = await this.vouchers.resolveNo('PROCESSING', body.voucher_no);
    const warehouseId = await this.stock.resolveId(body.warehouse_id);

    return this.prisma.processingOrder
      .create({
        data: {
          code: voucherNo,
          voucherNo,
          voucherDate,
          warehouseId,
          sourceIngredientId: body.source_ingredient_id,
          sourceQty: body.source_qty,
          outputIngredientId: body.output_ingredient_id,
          expectedQty,
          outputQty,
          note: body.note,
          createdById: userId,
        },
      })
      .catch((e) => this.vouchers.rethrowUnique(e, voucherNo));
  }

  async complete(id: string, userId: string) {
    const order = await this.prisma.processingOrder.findUnique({ where: { id } });
    if (!order) throw new NotFoundException('Không tìm thấy phiếu chế biến');
    if (order.status !== 'DRAFT') throw new BadRequestException('Chỉ hoàn thành phiếu ở trạng thái DRAFT');
    await this.periodLock.assertOpen(order.voucherDate);

    const source = await this.prisma.ingredient.findUnique({ where: { id: order.sourceIngredientId } });
    if (!source) throw new BadRequestException('Nguyên liệu nguồn không tồn tại');
    const sourceQty = Number(order.sourceQty);
    const outputQty = Number(order.outputQty);
    if ((await this.stock.getQty(this.prisma, order.sourceIngredientId, order.warehouseId)) < sourceQty)
      throw new BadRequestException('Không đủ tồn nguyên liệu nguồn');

    let outputCost = 0;
    await this.prisma.$transaction(async (tx) => {
      // 1. Giá vốn NL nguồn xuất theo phương pháp tính giá; trừ nguồn theo lô + trừ tồn
      const sourceCost = await this.costing.costOutbound(tx, order.sourceIngredientId, sourceQty);
      await this.batchDeduction.deductFromBatches(tx, order.sourceIngredientId, sourceQty, order.warehouseId);
      await this.stock.adjust(tx, order.sourceIngredientId, order.warehouseId, -sourceQty);
      await tx.stockTransaction.create({
        data: {
          ingredientId: order.sourceIngredientId,
          warehouseId: order.warehouseId,
          type: 'PROCESS_OUT',
          quantity: -sourceQty,
          unitPrice: sourceCost.unitCost,
          totalPrice: -sourceCost.totalCost,
          unitCost: sourceCost.unitCost,
          totalCost: sourceCost.totalCost,
          referenceId: order.code,
          createdById: userId,
          voucherDate: order.voucherDate,
          note: `Chế biến: ${order.code}`,
        },
      });

      // 2. Giá BTP = tổng giá vốn NL nguồn xuất ra; hao hụt tự đẩy giá vốn/đơn vị lên
      const movedValue = sourceCost.totalCost;
      outputCost = +(movedValue / outputQty).toFixed(2);
      await this.stock.adjust(tx, order.outputIngredientId, order.warehouseId, outputQty);
      await tx.ingredient.update({ where: { id: order.outputIngredientId }, data: { costPerUnit: outputCost } });
      await tx.stockTransaction.create({
        data: {
          ingredientId: order.outputIngredientId,
          warehouseId: order.warehouseId,
          type: 'PROCESS_IN',
          quantity: outputQty,
          unitPrice: outputCost,
          totalPrice: movedValue,
          unitCost: +(movedValue / outputQty).toFixed(4),
          totalCost: movedValue,
          referenceId: order.code,
          createdById: userId,
          voucherDate: order.voucherDate,
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
