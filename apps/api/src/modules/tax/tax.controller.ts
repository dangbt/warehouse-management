import { Controller, Get, Put, Body, Query, UseGuards } from '@nestjs/common';
import { TaxService } from './tax.service';
import type { UpdateTaxSettingDto } from './tax.service';
import { TaxReportsService } from './tax-reports.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { PermissionsGuard, RequirePermissions } from '../../auth/permissions.guard';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('tax')
export class TaxController {
  constructor(
    private svc: TaxService,
    private reports: TaxReportsService,
  ) {}

  @Get('settings')
  @RequirePermissions('tax:read')
  getSettings() {
    return this.svc.getSettings();
  }

  @Get('input-invoices')
  @RequirePermissions('tax:read')
  inputInvoices(@Query('period') period?: string) {
    return this.reports.inputInvoiceRegister(period);
  }

  @Get('no-invoice-purchases')
  @RequirePermissions('tax:read')
  noInvoicePurchases(@Query('period') period?: string) {
    return this.reports.noInvoicePurchaseRegister(period);
  }

  @Put('settings')
  @RequirePermissions('tax:manage')
  updateSettings(@Body() body: UpdateTaxSettingDto) {
    return this.svc.updateSettings(body);
  }
}
