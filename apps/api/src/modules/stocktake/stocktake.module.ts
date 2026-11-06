import { Module } from '@nestjs/common';
import { StocktakeController } from './stocktake.controller';
import { StocktakeService } from './stocktake.service';
import { CommonModule } from '../common/common.module';
import { CostingModule } from '../costing/costing.module';

@Module({
  imports: [CommonModule, CostingModule],
  controllers: [StocktakeController],
  providers: [StocktakeService],
})
export class StocktakeModule {}
