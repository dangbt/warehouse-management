import { Module } from '@nestjs/common';
import { ImportOrdersController } from './import-orders.controller';
import { ImportOrdersService } from './import-orders.service';
import { TaxModule } from '../tax/tax.module';

@Module({
  imports: [TaxModule],
  controllers: [ImportOrdersController],
  providers: [ImportOrdersService],
})
export class ImportOrdersModule {}
