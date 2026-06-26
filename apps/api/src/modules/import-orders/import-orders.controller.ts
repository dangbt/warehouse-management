import { Controller, Get, Post, Put, Param, Body, Query, UseGuards, Req } from '@nestjs/common';
import { ImportOrdersService } from './import-orders.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { PermissionsGuard, RequirePermissions } from '../../auth/permissions.guard';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('import-orders')
export class ImportOrdersController {
  constructor(private svc: ImportOrdersService) {}

  @Get()
  @RequirePermissions('import_orders:read')
  findAll(@Query() q: { page?: string; limit?: string; status?: string }) {
    return this.svc.findAll(q);
  }

  @Post()
  @RequirePermissions('import_orders:create')
  create(
    @Req() req,
    @Body()
    body: {
      supplier_id: string;
      note?: string;
      paid?: boolean;
      items: {
        ingredient_id: string;
        quantity: number;
        unit_price: number;
        expiry_date?: string;
      }[];
    },
  ) {
    return this.svc.create(req.user.id, body);
  }

  @Put(':id/approve')
  @RequirePermissions('import_orders:approve')
  approve(@Param('id') id: string, @Req() req) {
    return this.svc.approve(id, req.user.id);
  }

  @Put(':id/reject')
  @RequirePermissions('import_orders:approve')
  reject(@Param('id') id: string, @Body() body: { reason?: string }) {
    return this.svc.reject(id, body.reason);
  }
}
