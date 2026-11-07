import { Module } from '@nestjs/common';
import { KiotVietController } from './kiotviet.controller';
import { KiotVietService } from './kiotviet.service';
import { CommonModule } from '../common/common.module';
import { CostingModule } from '../costing/costing.module';

@Module({
  imports: [CommonModule, CostingModule],
  controllers: [KiotVietController],
  providers: [KiotVietService],
  exports: [KiotVietService],
})
export class KiotVietModule {}
