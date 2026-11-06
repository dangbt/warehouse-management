import { Module } from '@nestjs/common';
import { ImportOrdersController } from './import-orders.controller';
import { ImportOrdersService } from './import-orders.service';
import { ImportOrderUnpostService } from './import-order-unpost.service';
import { TaxModule } from '../tax/tax.module';
import { CommonModule } from '../common/common.module';

@Module({
  imports: [TaxModule, CommonModule],
  controllers: [ImportOrdersController],
  providers: [ImportOrdersService, ImportOrderUnpostService],
})
export class ImportOrdersModule {}
