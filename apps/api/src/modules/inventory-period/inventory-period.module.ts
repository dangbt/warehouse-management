import { Module } from '@nestjs/common';
import { CommonModule } from '../common/common.module';
import { CostingModule } from '../costing/costing.module';
import { InventoryPeriodController } from './inventory-period.controller';
import { InventoryPeriodService } from './inventory-period.service';

@Module({
  imports: [CommonModule, CostingModule],
  controllers: [InventoryPeriodController],
  providers: [InventoryPeriodService],
})
export class InventoryPeriodModule {}
