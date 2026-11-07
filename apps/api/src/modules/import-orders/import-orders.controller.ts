import { Controller, Get, Post, Put, Param, Body, Query, UseGuards, Req } from '@nestjs/common';
import { ImportOrdersService } from './import-orders.service';
import type { CreateImportOrderInput } from './import-orders.service';
import { ImportOrderUnpostService } from './import-order-unpost.service';
import { ImportOrdersBulkService } from './import-orders-bulk.service';
import type { BulkImportInput } from './import-orders-bulk.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { PermissionsGuard, RequirePermissions } from '../../auth/permissions.guard';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('import-orders')
export class ImportOrdersController {
  constructor(
    private svc: ImportOrdersService,
    private unposting: ImportOrderUnpostService,
    private bulk: ImportOrdersBulkService,
  ) {}

  @Get()
  @RequirePermissions('import_orders:read')
  findAll(
    @Query() q: { page?: string; limit?: string; status?: string; supplier_id?: string; has_invoice?: string; id?: string; from?: string; to?: string },
  ) {
    return this.svc.findAll(q);
  }

  /** Header đơn vị cho chứng từ in: chỉ tên/địa chỉ/MST, không nới quyền tax:read. Phải đứng trước ':id'. */
  @Get('print-header')
  @RequirePermissions('import_orders:read')
  printHeader() {
    return this.svc.getPrintHeader();
  }

  @Get(':id')
  @RequirePermissions('import_orders:read')
  findOne(@Param('id') id: string) {
    return this.svc.findOne(id);
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

  @Put(':id')
  @RequirePermissions('import_orders:create')
  update(@Param('id') id: string, @Body() body: CreateImportOrderInput) {
    return this.svc.update(id, body);
  }

  @Put(':id/unpost')
  @RequirePermissions('import_orders:approve')
  unpost(@Param('id') id: string) {
    return this.unposting.unpost(id);
  }

  @Put(':id/cancel')
  @RequirePermissions('import_orders:create')
  cancel(@Param('id') id: string) {
    return this.unposting.cancel(id);
  }
}
