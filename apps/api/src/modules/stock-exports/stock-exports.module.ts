import { Module } from '@nestjs/common';
import { StockExportsController } from './stock-exports.controller';
import { CommonModule } from '../common/common.module';
import { CostingModule } from '../costing/costing.module';

@Module({
  imports: [CommonModule, CostingModule],
  controllers: [StockExportsController],
})
export class StockExportsModule {}
