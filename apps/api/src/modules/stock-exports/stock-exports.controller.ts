import { Controller, Get, Post, Body, Query, UseGuards, Req, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { PermissionsGuard, RequirePermissions } from '../../auth/permissions.guard';
import { BatchDeductionService } from '../common/batch-deduction.service';
import { CostingService } from '../costing/costing.service';
import { VoucherService, parseVoucherDate } from '../common/voucher.service';
import { PeriodLockService } from '../common/period-lock.service';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('stock-exports')
export class StockExportsController {
  constructor(
    private prisma: PrismaService,
    private batchDeduction: BatchDeductionService,
    private vouchers: VoucherService,
    private costing: CostingService,
    private periodLock: PeriodLockService,
  ) {}

  @Get()
  @RequirePermissions('stock_exports:read')
  async findAll(@Query() q: { page?: string; limit?: string; orderBy?: string; sort?: string }) {
    const page = +(q.page || 1),
      limit = +(q.limit || 20);

    // Mặc định sort theo ngày chứng từ; chỉ cho phép các cột hợp lệ.
    const sortField = q.orderBy && ['voucherDate', 'createdAt', 'quantity'].includes(q.orderBy) ? q.orderBy : 'voucherDate';
    const sortDir = q.sort === 'asc' ? 'asc' : 'desc';

    const [data, total] = await Promise.all([
      this.prisma.stockTransaction.findMany({
        where: { type: 'EXPORT' },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { [sortField]: sortDir },
        include: { ingredient: true, createdBy: true, export: { select: { voucherNo: true, voucherDate: true } } },
      }),
      this.prisma.stockTransaction.count({ where: { type: 'EXPORT' } }),
    ]);
    return { data, meta: { page, limit, total } };
  }

  @Post()
  @RequirePermissions('stock_exports:create')
  async create(
    @Req() req,
    @Body()
    body: {
      ingredient_id: string;
      quantity: number;
      reason: string;
      note?: string;
      voucher_date?: string;
      voucher_no?: string;
    },
  ) {
    if (!body.ingredient_id || !body.quantity || body.quantity <= 0 || !body.reason) {
      throw new BadRequestException('Thiếu thông tin hoặc số lượng không hợp lệ');
    }

    const ingredient = await this.prisma.ingredient.findUnique({
      where: { id: body.ingredient_id },
    });
    if (!ingredient) throw new BadRequestException('Nguyên liệu không tồn tại');
    if (Number(ingredient.currentStock) < body.quantity) throw new BadRequestException('Không đủ tồn kho');

    const voucherDate = parseVoucherDate(body.voucher_date);
    await this.periodLock.assertOpen(voucherDate);
    const voucherNo = await this.vouchers.resolveNo('EXPORT', body.voucher_no);

    await this.prisma
      .$transaction(async (tx) => {
        const voucher = await tx.stockExport.create({ data: { voucherNo, voucherDate } });
        const cost = await this.costing.costOutbound(tx, body.ingredient_id, body.quantity);
        const deducted = await this.batchDeduction.deductFromBatches(tx, body.ingredient_id, body.quantity);

        await tx.ingredient.update({
          where: { id: body.ingredient_id },
          data: { currentStock: { decrement: body.quantity } },
        });

        for (const d of deducted) {
          await tx.stockTransaction.create({
            data: {
              ingredientId: body.ingredient_id,
              type: 'EXPORT',
              quantity: d.qty,
              unitCost: cost.unitCost,
              totalCost: +(d.qty * cost.unitCost).toFixed(2),
              referenceId: d.batchId,
              note: `${body.reason}${body.note ? ': ' + body.note : ''}`,
              createdById: req.user.id,
              voucherDate,
              exportId: voucher.id,
            },
          });
        }
      })
      .catch((e) => this.vouchers.rethrowUnique(e, voucherNo));
    return { message: 'Xuất kho thành công', voucher_no: voucherNo };
  }
}
