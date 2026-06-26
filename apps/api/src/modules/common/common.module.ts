import { Module } from '@nestjs/common';
import { CommonController } from './common.controller';
import { BatchDeductionService } from './batch-deduction.service';

@Module({
  controllers: [CommonController],
  providers: [BatchDeductionService],
  exports: [BatchDeductionService],
})
export class CommonModule {}
