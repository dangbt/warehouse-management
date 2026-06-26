import { Controller, Get, Post, Body, Query, UseGuards, Req } from '@nestjs/common';
import { PurchaseReturnsService } from './purchase-returns.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { PermissionsGuard, RequirePermissions } from '../../auth/permissions.guard';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('purchase-returns')
export class PurchaseReturnsController {
  constructor(private svc: PurchaseReturnsService) {}

  @Get()
  @RequirePermissions('purchase_returns:read')
  findAll(@Query() q: { page?: string; limit?: string; supplierId?: string }) {
    return this.svc.findAll(q);
  }

  @Post()
  @RequirePermissions('purchase_returns:create')
  create(
    @Req() req,
    @Body() body: { supplier_id: string; reason: string; note?: string; items: { ingredient_id: string; quantity: number; unit_price: number }[] },
  ) {
    return this.svc.create(req.user.id, body);
  }
}
