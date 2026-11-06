import { Module } from '@nestjs/common';
import { StockExportsController } from './stock-exports.controller';
import { StockExportCancelService } from './stock-export-cancel.service';
import { CommonModule } from '../common/common.module';
import { CostingModule } from '../costing/costing.module';

@Module({
  imports: [CommonModule, CostingModule],
  controllers: [StockExportsController],
  providers: [StockExportCancelService],
})
export class StockExportsModule {}
