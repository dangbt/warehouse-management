import { Body, Controller, Delete, Get, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { PermissionsGuard, RequirePermissions } from '../../auth/permissions.guard';
import { InventoryPeriodService } from './inventory-period.service';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('inventory-period')
export class InventoryPeriodController {
  constructor(private service: InventoryPeriodService) {}

  @Get()
  @RequirePermissions('inventory_period:read')
  status() {
    return this.service.getStatus();
  }

  @Post('lock')
  @RequirePermissions('inventory_period:close')
  lock(@Body() body: { date: string }) {
    return this.service.lock(body.date);
  }

  /** Mở khoá: query `date` để lùi ngày khoá; bỏ trống để mở khoá hoàn toàn. */
  @Delete('lock')
  @RequirePermissions('inventory_period:reopen')
  reopen(@Query('date') date?: string) {
    return this.service.reopen(date);
  }
}
