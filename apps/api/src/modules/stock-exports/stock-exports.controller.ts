import { Controller, Get, Post, Body, Query, Param, UseGuards, Req, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { PermissionsGuard, RequirePermissions } from '../../auth/permissions.guard';
import { BatchDeductionService } from '../common/batch-deduction.service';
import { VoucherService, parseVoucherDate } from '../common/voucher.service';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('stock-exports')
export class StockExportsController {
  constructor(
    private prisma: PrismaService,
    private batchDeduction: BatchDeductionService,
    private vouchers: VoucherService,
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
        include: { ingredient: true, createdBy: true, export: { select: { id: true, voucherNo: true, voucherDate: true } } },
      }),
      this.prisma.stockTransaction.count({ where: { type: 'EXPORT' } }),
    ]);
    return { data, meta: { page, limit, total } };
  }

  /** Chứng từ xuất kho để in 02-VT: mỗi dòng gắn giá vốn lấy từ lô đã trừ (referenceId = batchId). */
  @Get('vouchers/:id')
  @RequirePermissions('stock_exports:read')
  async findVoucher(@Param('id') id: string) {
    const voucher = await this.prisma.stockExport.findUnique({
      where: { id },
      include: {
        transactions: { include: { ingredient: true, createdBy: { select: { fullName: true } } }, orderBy: { createdAt: 'asc' } },
      },
    });
    if (!voucher) throw new NotFoundException('Không tìm thấy phiếu xuất kho');
    const batchIds = voucher.transactions.map((t) => t.referenceId).filter((x): x is string => !!x);
    const batches = await this.prisma.ingredientBatch.findMany({
      where: { id: { in: batchIds } },
      select: { id: true, costPerUnit: true },
    });
    const cost = new Map(batches.map((b) => [b.id, Number(b.costPerUnit)]));
    return {
      id: voucher.id,
      voucherNo: voucher.voucherNo,
      voucherDate: voucher.voucherDate,
      lines: voucher.transactions.map((t) => {
        const unitCost = (t.referenceId && cost.get(t.referenceId)) || Number(t.ingredient.costPerUnit);
        const quantity = Math.abs(Number(t.quantity));
        return {
          id: t.id,
          ingredient: { name: t.ingredient.name, unit: t.ingredient.unit },
          quantity,
          unitCost,
          totalCost: Math.round(quantity * unitCost),
          note: t.note,
          createdBy: t.createdBy?.fullName ?? null,
        };
      }),
    };
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
    const voucherNo = await this.vouchers.resolveNo('EXPORT', body.voucher_no);

    await this.prisma
      .$transaction(async (tx) => {
        const voucher = await tx.stockExport.create({ data: { voucherNo, voucherDate } });
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
