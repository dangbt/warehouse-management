import { Module } from '@nestjs/common';
import { CommonModule } from '../common/common.module';
import { CostingController } from './costing.controller';
import { CostingService } from './costing.service';
import { CostingPeriodService } from './costing-period.service';

@Module({
  imports: [CommonModule],
  controllers: [CostingController],
  providers: [CostingService, CostingPeriodService],
  exports: [CostingService, CostingPeriodService],
})
export class CostingModule {}
