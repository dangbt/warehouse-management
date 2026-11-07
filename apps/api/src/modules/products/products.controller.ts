import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { PermissionsGuard, RequirePermissions } from '../../auth/permissions.guard';
import { FeatureGuard, RequireFeature } from '../settings/feature.guard';
import { ProductsService } from './products.service';
import type { ProductBody } from './products.service';
import { VariantsService } from './variants.service';
import type { GenerateBody } from './variants.service';
import { AttributesService } from './attributes.service';

@UseGuards(JwtAuthGuard, PermissionsGuard, FeatureGuard)
@RequireFeature('product_variants')
@Controller('products')
export class ProductsController {
  constructor(
    private svc: ProductsService,
    private variants: VariantsService,
  ) {}

  @Get()
  @RequirePermissions('ingredients:read')
  findAll(@Query() q: { page?: string; limit?: string; search?: string; active?: string }) {
    return this.svc.findAll(q);
  }

  @Get(':id')
  @RequirePermissions('ingredients:read')
  findOne(@Param('id') id: string) {
    return this.svc.findOne(id);
  }

  @Post()
  @RequirePermissions('ingredients:create')
  create(@Body() body: ProductBody & { code: string; name: string }) {
    return this.svc.create(body);
  }

  @Put(':id')
  @RequirePermissions('ingredients:update')
  update(@Param('id') id: string, @Body() body: ProductBody) {
    return this.svc.update(id, body);
  }

  @Delete(':id')
  @RequirePermissions('ingredients:delete')
  remove(@Param('id') id: string) {
    return this.svc.remove(id);
  }

  @Post(':id/variants/generate')
  @RequirePermissions('ingredients:create')
  generate(@Param('id') id: string, @Body() body: GenerateBody) {
    return this.variants.generate(id, body);
  }
}

@UseGuards(JwtAuthGuard, PermissionsGuard, FeatureGuard)
@RequireFeature('product_variants')
@Controller('product-attributes')
export class AttributesController {
  constructor(private svc: AttributesService) {}

  @Get()
  @RequirePermissions('ingredients:read')
  list() {
    return this.svc.list();
  }

  @Post()
  @RequirePermissions('ingredients:create')
  create(@Body() b: { name: string; code?: string; sort?: number }) {
    return this.svc.create(b);
  }

  @Put('values/:valueId')
  @RequirePermissions('ingredients:update')
  updateValue(@Param('valueId') valueId: string, @Body() b: { value?: string; code?: string; sort?: number }) {
    return this.svc.updateValue(valueId, b);
  }

  @Delete('values/:valueId')
  @RequirePermissions('ingredients:delete')
  removeValue(@Param('valueId') valueId: string) {
    return this.svc.removeValue(valueId);
  }

  @Put(':id')
  @RequirePermissions('ingredients:update')
  update(@Param('id') id: string, @Body() b: { name?: string; code?: string; sort?: number }) {
    return this.svc.update(id, b);
  }

  @Delete(':id')
  @RequirePermissions('ingredients:delete')
  remove(@Param('id') id: string) {
    return this.svc.remove(id);
  }

  @Post(':id/values')
  @RequirePermissions('ingredients:update')
  addValue(@Param('id') id: string, @Body() b: { value: string; code?: string; sort?: number }) {
    return this.svc.addValue(id, b);
  }
}
