import { Module } from '@nestjs/common';
import { PurchaseReturnsController } from './purchase-returns.controller';
import { PurchaseReturnsService } from './purchase-returns.service';
import { CommonModule } from '../common/common.module';
import { CostingModule } from '../costing/costing.module';

@Module({
  imports: [CommonModule, CostingModule],
  controllers: [PurchaseReturnsController],
  providers: [PurchaseReturnsService],
})
export class PurchaseReturnsModule {}
