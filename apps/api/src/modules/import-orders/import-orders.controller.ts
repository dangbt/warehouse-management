import { Controller, Get, Post, Put, Param, Body, Query, UseGuards, Req } from '@nestjs/common';
import { ImportOrdersService } from './import-orders.service';
import type { CreateImportOrderInput } from './import-orders.service';
import { ImportOrdersBulkService } from './import-orders-bulk.service';
import type { BulkImportInput } from './import-orders-bulk.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { PermissionsGuard, RequirePermissions } from '../../auth/permissions.guard';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('import-orders')
export class ImportOrdersController {
  constructor(
    private svc: ImportOrdersService,
    private bulk: ImportOrdersBulkService,
  ) {}

  @Get()
  @RequirePermissions('import_orders:read')
  findAll(@Query() q: { page?: string; limit?: string; status?: string; supplier_id?: string; has_invoice?: string }) {
    return this.svc.findAll(q);
  }

  @Post()
  @RequirePermissions('import_orders:create')
  create(@Req() req, @Body() body: CreateImportOrderInput) {
    return this.svc.create(req.user.id, body);
  }

  @Post('bulk')
  @RequirePermissions('import_orders:create')
  bulkCreate(@Req() req, @Body() body: BulkImportInput) {
    return this.bulk.bulkCreate(req.user.id, body);
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
