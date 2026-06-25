import { Controller, Get, Post, Put, Param, Body, UseGuards } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller()
export class CommonController {
  constructor(private prisma: PrismaService) {}

  @Get('departments')
  departments() { return this.prisma.department.findMany(); }

  @Get('roles')
  roles() { return this.prisma.role.findMany({ include: { permissions: true } }); }

  @Post('roles')
  createRole(@Body() body: { name: string; code: string; description?: string }) {
    return this.prisma.role.create({ data: body });
  }

  @Put('roles/:id/permissions')
  async updatePermissions(@Param('id') id: string, @Body() body: { permissions: { resource: string; action: string }[] }) {
    await this.prisma.rolePermission.deleteMany({ where: { roleId: id } });
    await this.prisma.rolePermission.createMany({ data: body.permissions.map((p) => ({ roleId: id, resource: p.resource, action: p.action })) });
    return this.prisma.role.findUnique({ where: { id }, include: { permissions: true } });
  }

  @Get('menu-items')
  menuItems() { return this.prisma.menuItem.findMany(); }
}
