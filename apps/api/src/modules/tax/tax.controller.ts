import { Controller, Get, Put, Body, UseGuards } from '@nestjs/common';
import { TaxService } from './tax.service';
import type { UpdateTaxSettingDto } from './tax.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { PermissionsGuard, RequirePermissions } from '../../auth/permissions.guard';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('tax')
export class TaxController {
  constructor(private svc: TaxService) {}

  @Get('settings')
  @RequirePermissions('tax:read')
  getSettings() {
    return this.svc.getSettings();
  }

  @Put('settings')
  @RequirePermissions('tax:manage')
  updateSettings(@Body() body: UpdateTaxSettingDto) {
    return this.svc.updateSettings(body);
  }
}
