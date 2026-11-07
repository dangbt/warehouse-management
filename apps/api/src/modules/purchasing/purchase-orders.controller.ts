import { Controller, Get, Post, Put, Param, Body, Query, UseGuards, Req } from '@nestjs/common';
import { PurchaseOrdersService } from './purchase-orders.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { PermissionsGuard, RequirePermissions } from '../../auth/permissions.guard';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('purchase-orders')
export class PurchaseOrdersController {
  constructor(private svc: PurchaseOrdersService) {}

  @Get()
  @RequirePermissions('purchase_orders:read')
  findAll(@Query() q: { page?: string; limit?: string; status?: string; supplier_id?: string }) {
    return this.svc.findAll(q);
  }

  @Get(':id')
  @RequirePermissions('purchase_orders:read')
  findOne(@Param('id') id: string) {
    return this.svc.findOne(id);
  }

  @Get(':id/receipt-draft')
  @RequirePermissions('purchase_orders:read')
  receiptDraft(@Param('id') id: string) {
    return this.svc.receiptDraft(id);
  }

  @Post('from-request')
  @RequirePermissions('purchase_orders:create')
  fromRequest(@Req() req, @Body() body: { request_id: string }) {
    return this.svc.createFromRequest(body.request_id, req.user.id);
  }

  @Put(':id/cancel')
  @RequirePermissions('purchase_orders:update')
  cancel(@Param('id') id: string) {
    return this.svc.cancel(id);
  }
}
