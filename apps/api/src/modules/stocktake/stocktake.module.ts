import { Module } from '@nestjs/common';
import { StocktakeController } from './stocktake.controller';
import { StocktakeService } from './stocktake.service';
import { CommonModule } from '../common/common.module';

@Module({
  imports: [CommonModule],
  controllers: [StocktakeController],
  providers: [StocktakeService],
})
export class StocktakeModule {}
