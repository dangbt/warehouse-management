import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('suppliers')
export class SuppliersController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async findAll(@Query() q: { page?: string; limit?: string; search?: string }) {
    const page = Math.max(1, +(q.page || 1)), limit = Math.min(100, Math.max(1, +(q.limit || 20)));
    const where: Record<string, unknown> = q.search ? { name: { contains: q.search, mode: 'insensitive' } } : {};
    const [data, total] = await Promise.all([
      this.prisma.supplier.findMany({ where, skip: (page - 1) * limit, take: limit }),
      this.prisma.supplier.count({ where }),
    ]);
    return { data, meta: { page, limit, total } };
  }

  @Post()
  create(@Body() body: { name: string; phone?: string; address?: string; note?: string }) {
    return this.prisma.supplier.create({ data: body });
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() body: { name?: string; phone?: string; address?: string; note?: string }) {
    const exists = await this.prisma.supplier.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Nhà cung cấp không tồn tại');
    return this.prisma.supplier.update({ where: { id }, data: body });
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    const exists = await this.prisma.supplier.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Nhà cung cấp không tồn tại');
    const hasOrders = await this.prisma.importOrder.findFirst({ where: { supplierId: id } });
    if (hasOrders) throw new ConflictException('Không thể xoá nhà cung cấp đã có phiếu nhập');
    return this.prisma.supplier.delete({ where: { id } });
  }
}
