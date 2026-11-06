import { Module } from '@nestjs/common';
import { ReportsController } from './reports.controller';
import { InventorySummaryRepository } from './inventory-summary.repository';

@Module({ controllers: [ReportsController], providers: [InventorySummaryRepository] })
export class ReportsModule {}
