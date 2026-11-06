import { Module } from '@nestjs/common';
import { CommonController } from './common.controller';
import { VoucherService } from './voucher.service';
import { VouchersController } from './vouchers.controller';
import { BatchDeductionService } from './batch-deduction.service';

@Module({
  controllers: [CommonController, VouchersController],
  providers: [BatchDeductionService, VoucherService],
  exports: [BatchDeductionService, VoucherService],
})
export class CommonModule {}
