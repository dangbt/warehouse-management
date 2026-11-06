import { Body, Controller, Get, Post, Put, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { PermissionsGuard, RequirePermissions } from '../../auth/permissions.guard';
import { CostingService } from './costing.service';
import { CostingPeriodService } from './costing-period.service';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('costing')
export class CostingController {
  constructor(
    private costing: CostingService,
    private period: CostingPeriodService,
  ) {}

  @Get('settings')
  @RequirePermissions('tax:read')
  getSettings() {
    return this.costing.getSettings();
  }

  @Put('settings')
  @RequirePermissions('tax:manage')
  setSettings(@Body() body: { costing_method: string; confirm?: boolean }) {
    return this.costing.setMethod(body.costing_method, body.confirm === true);
  }

  @Post('run')
  @RequirePermissions('tax:manage')
  run(@Body() body: { month: string }) {
    return this.period.run(body.month);
  }
}
