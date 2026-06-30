import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { PermissionsGuard, RequirePermissions } from '../../auth/permissions.guard';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions('audit_logs:read')
@Controller('audit-logs')
export class AuditLogsController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async findAll(
    @Query()
    q: {
      page?: string;
      limit?: string;
      user_id?: string;
      action?: string;
      resource?: string;
      orderBy?: string;
      sort?: string;
    },
  ) {
    const page = Math.max(1, +(q.page || 1)),
      limit = Math.min(50, Math.max(1, +(q.limit || 20)));
    const where: { userId?: string; action?: string; resource?: string } = {};
    if (q.user_id) where.userId = q.user_id;
    if (q.action) where.action = q.action;
    if (q.resource) where.resource = q.resource;

    const sortField = q.orderBy || 'createdAt';
    const sortDir = q.sort === 'asc' ? 'asc' : 'desc';

    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { [sortField]: sortDir },
        include: { user: { select: { id: true, fullName: true } } },
      }),
      this.prisma.auditLog.count({ where }),
    ]);
    return { data, meta: { page, limit, total } };
  }
}
