import { Controller, Get, Post, Put, Param, Body, Query, UseGuards, NotFoundException, ConflictException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async findAll(@Query() q: { page?: string; limit?: string }) {
    const page = Math.max(1, +(q.page || 1)), limit = Math.min(100, Math.max(1, +(q.limit || 20)));
    const [data, total] = await Promise.all([
      this.prisma.user.findMany({ skip: (page - 1) * limit, take: limit, include: { department: true, userRoles: { include: { role: true } } }, orderBy: { fullName: 'asc' } }),
      this.prisma.user.count(),
    ]);
    return { data: data.map(({ passwordHash, ...u }) => u), meta: { page, limit, total } };
  }

  @Post()
  async create(@Body() body: { email: string; password?: string; full_name: string; phone?: string; department_id: string; role_ids: string[] }) {
    const existing = await this.prisma.user.findUnique({ where: { email: body.email } });
    if (existing) throw new ConflictException('Email đã tồn tại');

    const hash = await bcrypt.hash(body.password || '123456', 10);
    const user = await this.prisma.user.create({
      data: {
        email: body.email,
        passwordHash: hash,
        fullName: body.full_name,
        phone: body.phone,
        departmentId: body.department_id,
        userRoles: { create: body.role_ids.map((roleId) => ({ roleId })) },
      },
      include: { department: true, userRoles: { include: { role: true } } },
    });
    const { passwordHash, ...result } = user;
    return result;
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() body: { full_name?: string; phone?: string; department_id?: string; is_active?: boolean }) {
    const exists = await this.prisma.user.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Người dùng không tồn tại');
    return this.prisma.user.update({ where: { id }, data: { fullName: body.full_name, phone: body.phone, departmentId: body.department_id, isActive: body.is_active } });
  }

  @Put(':id/toggle-active')
  async toggleActive(@Param('id') id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Người dùng không tồn tại');
    return this.prisma.user.update({ where: { id }, data: { isActive: !user.isActive } });
  }
}
