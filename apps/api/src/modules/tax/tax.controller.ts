import { Controller, Get, Post, Put, Delete, Param, Body, Query, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { TaxService } from './tax.service';
import type { UpdateTaxSettingDto } from './tax.service';
import { TaxReportsService } from './tax-reports.service';
import { TaxSummaryService } from './tax-summary.service';
import { TaxBooksService } from './tax-books.service';
import { KiotVietService } from '../kiotviet/kiotviet.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { PermissionsGuard, RequirePermissions } from '../../auth/permissions.guard';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('tax')
export class TaxController {
  constructor(
    private svc: TaxService,
    private reports: TaxReportsService,
    private summary: TaxSummaryService,
    private books: TaxBooksService,
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

  @Get('books/revenue')
  @RequirePermissions('tax:read')
  revenueBook(@Query('period') period?: string) {
    return this.books.revenueBook(period);
  }

  @Get('books/materials')
  @RequirePermissions('tax:read')
  materialsBook(@Query('period') period?: string, @Query('ingredient_id') ingredientId?: string) {
    return this.books.materialsBook(period, ingredientId || undefined);
  }

  @Post('recompute-output-vat')
  @RequirePermissions('tax:manage')
  recomputeOutputVat(@Query('period') period?: string) {
    return this.kiotviet.recomputeOutputVat(period);
  }

  @Get('summary')
  @RequirePermissions('tax:read')
  getSummary(@Query('period') period?: string, @Query('carried_forward') carriedForward?: string) {
    const cf = carriedForward !== undefined && carriedForward !== '' ? Number(carriedForward) : undefined;
    return this.summary.summary(period, cf);
  }

  @Post('periods/:period/close')
  @RequirePermissions('tax:manage')
  closePeriod(
    @Param('period') period: string,
    @Req() req: Request & { user: { id: string } },
    @Query('carried_forward') carriedForward?: string,
  ) {
    const cf = carriedForward !== undefined && carriedForward !== '' ? Number(carriedForward) : undefined;
    return this.summary.closePeriod(period, req.user?.id, cf);
  }

  @Delete('periods/:period/close')
  @RequirePermissions('tax:manage')
  reopenPeriod(@Param('period') period: string) {
    return this.summary.reopenPeriod(period);
  }

  @Put('settings')
  @RequirePermissions('tax:manage')
  updateSettings(@Body() body: UpdateTaxSettingDto) {
    return this.svc.updateSettings(body);
  }
}
