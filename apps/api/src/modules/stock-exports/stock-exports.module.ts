import { Module } from '@nestjs/common';
import { StockExportsController } from './stock-exports.controller';
import { CommonModule } from '../common/common.module';

@Module({
  imports: [CommonModule],
  controllers: [StockExportsController],
})
export class StockExportsModule {}
