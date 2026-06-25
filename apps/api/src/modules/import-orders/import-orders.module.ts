import { Module } from '@nestjs/common';
import { ImportOrdersController } from './import-orders.controller';
import { ImportOrdersService } from './import-orders.service';

@Module({ controllers: [ImportOrdersController], providers: [ImportOrdersService] })
export class ImportOrdersModule {}
