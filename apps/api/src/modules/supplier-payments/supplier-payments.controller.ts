import { Controller, Get, Post, Body, Query, Param, UseGuards, Req } from '@nestjs/common';
import { SupplierPaymentsService } from './supplier-payments.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { PermissionsGuard, RequirePermissions } from '../../auth/permissions.guard';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('supplier-payments')
export class SupplierPaymentsController {
  constructor(private svc: SupplierPaymentsService) {}

  @Get()
  @RequirePermissions('supplier_payments:read')
  findAll(@Query() q: { page?: string; limit?: string; supplierId?: string }) {
    return this.svc.findAll(q);
  }

  @Get(':id')
  @RequirePermissions('supplier_payments:read')
  findOne(@Param('id') id: string) {
    return this.svc.findOne(id);
  }

  @Post()
  @RequirePermissions('supplier_payments:create')
  create(@Req() req, @Body() body: { supplier_id: string; amount: number; method: string; note?: string }) {
    return this.svc.create(req.user.id, body);
  }
}
