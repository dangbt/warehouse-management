import { Controller, Get, Post, Put, Param, Body, Query, UseGuards, Req } from '@nestjs/common';
import { PurchaseRequestsService } from './purchase-requests.service';
import type { CreatePurchaseRequestInput } from './purchase-requests.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { PermissionsGuard, RequirePermissions } from '../../auth/permissions.guard';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('purchase-requests')
export class PurchaseRequestsController {
  constructor(private svc: PurchaseRequestsService) {}

  @Get()
  @RequirePermissions('purchase_requests:read')
  findAll(@Query() q: { page?: string; limit?: string; status?: string }) {
    return this.svc.findAll(q);
  }

  @Get('suggest-low-stock')
  @RequirePermissions('purchase_requests:create')
  suggest(@Query('safety_factor') safetyFactor?: string) {
    return this.svc.suggestLowStock(safetyFactor);
  }

  @Post()
  @RequirePermissions('purchase_requests:create')
  create(@Req() req, @Body() body: CreatePurchaseRequestInput) {
    return this.svc.create(req.user.id, body);
  }

  @Put(':id/approve')
  @RequirePermissions('purchase_requests:approve')
  approve(@Param('id') id: string, @Req() req) {
    return this.svc.approve(id, req.user.id);
  }

  @Put(':id/reject')
  @RequirePermissions('purchase_requests:approve')
  reject(@Param('id') id: string) {
    return this.svc.reject(id);
  }
}
