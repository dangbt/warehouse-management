import { Module } from '@nestjs/common';
import { CostingController } from './costing.controller';
import { CostingService } from './costing.service';
import { CostingPeriodService } from './costing-period.service';

@Module({
  controllers: [CostingController],
  providers: [CostingService, CostingPeriodService],
  exports: [CostingService],
})
export class CostingModule {}
