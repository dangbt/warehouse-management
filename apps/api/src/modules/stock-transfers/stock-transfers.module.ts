import { Module } from '@nestjs/common';
import { CommonModule } from '../common/common.module';
import { StockTransferPostService } from './stock-transfer-post.service';
import { StockTransfersController } from './stock-transfers.controller';
import { StockTransfersService } from './stock-transfers.service';

@Module({
  imports: [CommonModule],
  controllers: [StockTransfersController],
  providers: [StockTransfersService, StockTransferPostService],
})
export class StockTransfersModule {}
