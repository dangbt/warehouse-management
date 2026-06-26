import { Controller, Get, Post, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { PermissionsGuard, RequirePermissions } from '../../auth/permissions.guard';
import { KiotVietService } from './kiotviet.service';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('kiotviet')
export class KiotVietController {
  constructor(private svc: KiotVietService) {}

  @Get('orders')
  @RequirePermissions('kiotviet:read')
  getOrders(@Query() q: { page?: string; limit?: string; deducted?: string }) {
    return this.svc.getOrders(q);
  }

  @Post('sync')
  @RequirePermissions('kiotviet:sync')
  sync(@Body() body: { orders: any[] }) {
    return this.svc.syncOrders(body.orders);
  }

  @Post('orders/:id/deduct')
  @RequirePermissions('kiotviet:deduct')
  deduct(@Param('id') id: string, @Req() req) {
    return this.svc.deductOrder(id, req.user.id);
  }
}
