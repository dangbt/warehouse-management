import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { PermissionsGuard, RequirePermissions } from '../../auth/permissions.guard';

/**
 * Chuẩn hoá + validate mã số thuế NCC.
 * Cho phép 10 hoặc 13 chữ số, hoặc dạng đơn vị phụ thuộc `0123456789-001`.
 * Rỗng/undefined ⇒ null.
 */
function normalizeTaxCode(raw: string | undefined): string | null {
  if (raw === undefined) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const valid = /^\d{10}$/.test(trimmed) || /^\d{13}$/.test(trimmed) || /^\d{10}-\d{3}$/.test(trimmed);
  if (!valid) {
    throw new BadRequestException('Mã số thuế phải có 10 hoặc 13 chữ số (cho phép dạng 0123456789-001)');
  }
  return trimmed;
}

/**
 * Chuẩn hoá + validate số CCCD/CMND của người bán cá nhân.
 * Cho phép 9 chữ số (CMND cũ) hoặc 12 chữ số (CCCD). Rỗng/undefined ⇒ null.
 */
function normalizeIdNumber(raw: string | undefined): string | null {
  if (raw === undefined) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (!/^\d{9}$/.test(trimmed) && !/^\d{12}$/.test(trimmed)) {
    throw new BadRequestException('Số CCCD/CMND phải có 9 hoặc 12 chữ số');
  }
  return trimmed;
}

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('suppliers')
export class SuppliersController {
  constructor(private prisma: PrismaService) {}

  @Get()
  @RequirePermissions('suppliers:read')
  async findAll(@Query() q: { page?: string; limit?: string; search?: string }) {
    const page = Math.max(1, +(q.page || 1)),
      limit = Math.min(50, Math.max(1, +(q.limit || 20)));
    const where: Record<string, unknown> = q.search ? { name: { contains: q.search, mode: 'insensitive' } } : {};
    const [data, total] = await Promise.all([
      this.prisma.supplier.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.supplier.count({ where }),
    ]);
    return { data, meta: { page, limit, total } };
  }

  @Post()
  @RequirePermissions('suppliers:create')
  create(
    @Body()
    body: {
      name: string;
      phone?: string;
      address?: string;
      tax_code?: string;
      note?: string;
      is_individual?: boolean;
      id_number?: string;
    },
  ) {
    return this.prisma.supplier.create({
      data: {
        name: body.name,
        phone: body.phone,
        address: body.address,
        taxCode: normalizeTaxCode(body.tax_code),
        note: body.note,
        isIndividual: body.is_individual ?? false,
        idNumber: normalizeIdNumber(body.id_number),
      },
    });
  }

  @Put(':id')
  @RequirePermissions('suppliers:update')
  async update(
    @Param('id') id: string,
    @Body()
    body: {
      name?: string;
      phone?: string;
      address?: string;
      tax_code?: string;
      note?: string;
      is_individual?: boolean;
      id_number?: string;
    },
  ) {
    const exists = await this.prisma.supplier.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Nhà cung cấp không tồn tại');
    const data: {
      name?: string;
      phone?: string;
      address?: string;
      taxCode?: string | null;
      note?: string;
      isIndividual?: boolean;
      idNumber?: string | null;
    } = {};
    if (body.name !== undefined) data.name = body.name;
    if (body.phone !== undefined) data.phone = body.phone;
    if (body.address !== undefined) data.address = body.address;
    if (body.note !== undefined) data.note = body.note;
    if (body.tax_code !== undefined) data.taxCode = normalizeTaxCode(body.tax_code);
    if (body.is_individual !== undefined) data.isIndividual = body.is_individual;
    if (body.id_number !== undefined) data.idNumber = normalizeIdNumber(body.id_number);
    return this.prisma.supplier.update({ where: { id }, data });
  }

  @Delete(':id')
  @RequirePermissions('suppliers:delete')
  async remove(@Param('id') id: string) {
    const exists = await this.prisma.supplier.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Nhà cung cấp không tồn tại');
    const hasOrders = await this.prisma.importOrder.findFirst({
      where: { supplierId: id },
    });
    if (hasOrders) throw new ConflictException('Không thể xoá nhà cung cấp đã có phiếu nhập');
    return this.prisma.supplier.delete({ where: { id } });
  }
}
