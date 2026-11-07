import { Body, Controller, Get, Param, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { PermissionsGuard, RequirePermissions } from '../../auth/permissions.guard';
import { StockTransferPostService } from './stock-transfer-post.service';
import { StockTransfersService } from './stock-transfers.service';
import type { CreateStockTransferInput } from './stock-transfers.service';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('stock-transfers')
export class StockTransfersController {
  constructor(
    private svc: StockTransfersService,
    private poster: StockTransferPostService,
  ) {}

  @Get()
  @RequirePermissions('stock_transfers:read')
  findAll(@Query() q: { page?: string; limit?: string; from?: string; to?: string; warehouse_id?: string; status?: string; id?: string }) {
    return this.svc.findAll(q);
  }

  @Get(':id')
  @RequirePermissions('stock_transfers:read')
  findOne(@Param('id') id: string) {
    return this.svc.findOne(id);
  }

  @Post()
  @RequirePermissions('stock_transfers:create')
  create(@Req() req: { user: { id: string } }, @Body() body: CreateStockTransferInput) {
    return this.svc.create(req.user.id, body);
  }

  @Put(':id/approve')
  @RequirePermissions('stock_transfers:approve')
  approve(@Req() req: { user: { id: string } }, @Param('id') id: string) {
    return this.poster.approve(id, req.user.id);
  }

  @Put(':id/unpost')
  @RequirePermissions('stock_transfers:approve')
  unpost(@Param('id') id: string) {
    return this.poster.unpost(id);
  }

  @Put(':id/cancel')
  @RequirePermissions('stock_transfers:create')
  cancel(@Param('id') id: string) {
    return this.svc.cancel(id);
  }
}
