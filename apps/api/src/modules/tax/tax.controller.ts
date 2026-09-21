import { Controller, Get, Post, Put, Body, Query, UseGuards } from '@nestjs/common';
import { TaxService } from './tax.service';
import type { UpdateTaxSettingDto } from './tax.service';
import { TaxReportsService } from './tax-reports.service';
import { KiotVietService } from '../kiotviet/kiotviet.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { PermissionsGuard, RequirePermissions } from '../../auth/permissions.guard';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('tax')
export class TaxController {
  constructor(
    private svc: TaxService,
    private reports: TaxReportsService,
    private kiotviet: KiotVietService,
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

  @Get('output-revenue')
  @RequirePermissions('tax:read')
  outputRevenue(@Query('period') period?: string) {
    return this.reports.outputRevenue(period);
  }

  @Post('recompute-output-vat')
  @RequirePermissions('tax:manage')
  recomputeOutputVat(@Query('period') period?: string) {
    return this.kiotviet.recomputeOutputVat(period);
  }

  @Put('settings')
  @RequirePermissions('tax:manage')
  updateSettings(@Body() body: UpdateTaxSettingDto) {
    return this.svc.updateSettings(body);
  }
}
