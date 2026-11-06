import { Module } from '@nestjs/common';
import { PurchaseRequestsController } from './purchase-requests.controller';
import { PurchaseRequestsService } from './purchase-requests.service';
import { PurchaseOrdersController } from './purchase-orders.controller';
import { PurchaseOrdersService } from './purchase-orders.service';

@Module({
  controllers: [PurchaseRequestsController, PurchaseOrdersController],
  providers: [PurchaseRequestsService, PurchaseOrdersService],
})
export class PurchasingModule {}
