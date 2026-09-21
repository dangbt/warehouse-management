import { Module } from '@nestjs/common';
import { TaxController } from './tax.controller';
import { TaxService } from './tax.service';
import { TaxReportsService } from './tax-reports.service';
import { TaxSummaryService } from './tax-summary.service';
import { KiotVietModule } from '../kiotviet/kiotviet.module';

@Module({
  imports: [KiotVietModule],
  controllers: [TaxController],
  providers: [TaxService, TaxReportsService, TaxSummaryService],
  exports: [TaxService, TaxReportsService, TaxSummaryService],
})
export class TaxModule {}
