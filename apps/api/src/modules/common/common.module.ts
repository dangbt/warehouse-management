import { Module } from '@nestjs/common';
import { CommonController } from './common.controller';
import { VoucherService } from './voucher.service';
import { VouchersController } from './vouchers.controller';
import { PeriodLockService } from './period-lock.service';
import { WarehouseStockService } from './warehouse-stock.service';
import { BatchDeductionService } from './batch-deduction.service';

@Module({
  controllers: [CommonController, VouchersController],
  providers: [WarehouseStockService, BatchDeductionService, VoucherService, PeriodLockService],
  exports: [WarehouseStockService, BatchDeductionService, VoucherService, PeriodLockService],
})
export class CommonModule {}
