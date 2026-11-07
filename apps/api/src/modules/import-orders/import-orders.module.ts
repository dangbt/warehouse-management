import { Module } from '@nestjs/common';
import { ImportOrdersController } from './import-orders.controller';
import { ImportOrdersService } from './import-orders.service';
import { ImportOrderUnpostService } from './import-order-unpost.service';
import { ImportOrdersBulkService } from './import-orders-bulk.service';
import { EinvoiceController } from './einvoice/einvoice.controller';
import { EinvoiceService } from './einvoice/einvoice.service';
import { SupplierItemMappingService } from './einvoice/supplier-item-mapping.service';
import { TaxModule } from '../tax/tax.module';
import { CommonModule } from '../common/common.module';

@Module({
  imports: [TaxModule, CommonModule],
  controllers: [ImportOrdersController, EinvoiceController],
  providers: [ImportOrdersService, ImportOrderUnpostService, ImportOrdersBulkService, EinvoiceService, SupplierItemMappingService],
})
export class ImportOrdersModule {}
