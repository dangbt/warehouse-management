import { Controller, Get, Post, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { PermissionsGuard, RequirePermissions } from '../../auth/permissions.guard';
import { KiotVietService } from './kiotviet.service';

interface SyncBody {
  orders: {
    id: string;
    code: string;
    customerName?: string;
    totalAmount: number;
    orderDate: string;
    items: { productName: string; quantity: number; price: number }[];
  }[];
}

interface SyncApiBody {
  clientId: string;
  clientSecret: string;
  retailer: string;
  fromDate?: string;
  toDate?: string;
}

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('kiotviet')
export class KiotVietController {
  constructor(private svc: KiotVietService) {}

  @Get('orders')
  @RequirePermissions('kiotviet:read')
  getOrders(@Query() q: { page?: string; limit?: string; deducted?: string; orderBy?: string; sort?: string }) {
    return this.svc.getOrders(q);
  }

  @Post('sync')
  @RequirePermissions('kiotviet:sync')
  sync(@Body() body: SyncBody, @Req() req: Request & { user: { id: string } }) {
    return this.svc.syncOrders(body.orders, req.user.id);
  }

  @Post('sync-api')
  @RequirePermissions('kiotviet:sync')
  syncFromApi(@Body() body: SyncApiBody, @Req() req: Request & { user: { id: string } }) {
    return this.svc.syncFromApi(body, req.user.id);
  }

  @Post('sync-products')
  @RequirePermissions('kiotviet:sync')
  syncProducts(@Body() body: { products: { id: string; name: string; price?: number; category?: string }[] }) {
    return this.svc.syncProducts(body.products);
  }

  @Post('orders/:id/deduct')
  @RequirePermissions('kiotviet:deduct')
  deduct(@Param('id') id: string, @Req() req: Request & { user: { id: string } }) {
    return this.svc.deductOrder(id, req.user.id);
  }
}
