import { Module } from '@nestjs/common';
import { KiotVietController } from './kiotviet.controller';
import { KiotVietService } from './kiotviet.service';
import { CommonModule } from '../common/common.module';

@Module({
  imports: [CommonModule],
  controllers: [KiotVietController],
  providers: [KiotVietService],
})
export class KiotVietModule {}
