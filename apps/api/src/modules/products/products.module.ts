import { Module } from '@nestjs/common';
import { ProductsController, AttributesController } from './products.controller';
import { ProductsService } from './products.service';
import { VariantsService } from './variants.service';
import { AttributesService } from './attributes.service';

@Module({
  controllers: [ProductsController, AttributesController],
  providers: [ProductsService, VariantsService, AttributesService],
})
export class ProductsModule {}
