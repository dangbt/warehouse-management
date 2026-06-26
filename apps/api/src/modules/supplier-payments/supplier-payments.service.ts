import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SupplierPaymentsService {
  constructor(private prisma: PrismaService) {}

  async findAll(q: { page?: string; limit?: string; supplierId?: string }) {
    const page = +(q.page || 1),
      limit = +(q.limit || 20);
    const where: { supplierId?: string } = q.supplierId ? { supplierId: q.supplierId } : {};
    const [data, total] = await Promise.all([
      this.prisma.supplierPayment.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { supplier: true, createdBy: { select: { id: true, fullName: true } } },
      }),
      this.prisma.supplierPayment.count({ where }),
    ]);
    return { data, meta: { page, limit, total } };
  }

  async create(
    userId: string,
    body: { supplier_id: string; amount: number; method: string; note?: string },
  ) {
    if (!body.supplier_id || !body.amount || body.amount <= 0) {
      throw new BadRequestException('Thiếu thông tin hoặc số tiền không hợp lệ');
    }
    if (!['CASH', 'TRANSFER'].includes(body.method)) {
      throw new BadRequestException('Phương thức thanh toán không hợp lệ');
    }

    return this.prisma.$transaction(async (tx) => {
      const payment = await tx.supplierPayment.create({
        data: {
          supplierId: body.supplier_id,
          amount: body.amount,
          method: body.method,
          note: body.note,
          createdById: userId,
        },
      });

      await tx.supplier.update({
        where: { id: body.supplier_id },
        data: { totalDebt: { decrement: body.amount } },
      });

      return payment;
    });
  }
}
