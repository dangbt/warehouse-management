import { Module } from '@nestjs/common';
import { TaxController } from './tax.controller';
import { TaxService } from './tax.service';
import { TaxReportsService } from './tax-reports.service';

@Module({
  controllers: [TaxController],
  providers: [TaxService, TaxReportsService],
  exports: [TaxService, TaxReportsService],
})
export class TaxModule {}
