import { Module } from '@nestjs/common';
import { BatchesController } from './batches.controller';

@Module({ controllers: [BatchesController] })
export class BatchesModule {}
