import { Controller, Get, Post, Put, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { PermissionsGuard, RequirePermissions } from '../../auth/permissions.guard';
import { KiotVietService } from './kiotviet.service';
import { KiotVietWarehouseService, BranchWarehouseMap } from './kiotviet-warehouse.service';
import { FeatureGuard, RequireFeature } from '../settings/feature.guard';

interface SyncBody {
  orders: {
    id: string;
    code: string;
    customerName?: string;
    branchId?: string;
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

@UseGuards(JwtAuthGuard, PermissionsGuard, FeatureGuard)
@RequireFeature('sales_channels')
@Controller('kiotviet')
export class KiotVietController {
  constructor(
    private svc: KiotVietService,
    private warehouses: KiotVietWarehouseService,
  ) {}

  @Get('warehouse-mapping')
  @RequirePermissions('kiotviet:read')
  getWarehouseMapping() {
    return this.warehouses.getMap();
  }

  @Put('warehouse-mapping')
  @RequirePermissions('kiotviet:sync')
  setWarehouseMapping(@Body() body: Partial<BranchWarehouseMap>) {
    return this.warehouses.setMap(body);
  }

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
  @RequireFeature('kiotviet_recipe_deduct')
  @RequirePermissions('kiotviet:deduct')
  deduct(@Param('id') id: string, @Req() req: Request & { user: { id: string } }) {
    return this.svc.deductOrder(id, req.user.id);
  }
}
