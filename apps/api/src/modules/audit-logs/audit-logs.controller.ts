import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('audit-logs')
export class AuditLogsController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async findAll(@Query() q: { page?: string; limit?: string; user_id?: string; action?: string; resource?: string }) {
    const page = +(q.page || 1), limit = +(q.limit || 50);
    const where: any = {};
    if (q.user_id) where.userId = q.user_id;
    if (q.action) where.action = q.action;
    if (q.resource) where.resource = q.resource;

    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: { createdAt: 'desc' }, include: { user: { select: { id: true, fullName: true } } } }),
      this.prisma.auditLog.count({ where }),
    ]);
    return { data, meta: { page, limit, total } };
  }
}
