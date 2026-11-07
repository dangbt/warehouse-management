import { Module } from '@nestjs/common';
import { ReportsController } from './reports.controller';
import { InventorySummaryRepository } from './inventory-summary.repository';
import { ProductReportsRepository } from './product-reports.repository';
import { StockCardRepository } from './stock-card.repository';

@Module({ controllers: [ReportsController], providers: [InventorySummaryRepository, StockCardRepository, ProductReportsRepository] })
export class ReportsModule {}
