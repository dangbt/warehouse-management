import { Module } from '@nestjs/common';
import { StockExportsController } from './stock-exports.controller';

@Module({ controllers: [StockExportsController] })
export class StockExportsModule {}
