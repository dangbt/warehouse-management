import { Controller, Get, Post, Put, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { PermissionsGuard, RequirePermissions } from '../../auth/permissions.guard';
import { IngredientGroupsService } from './ingredient-groups.service';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('ingredient-groups')
export class IngredientGroupsController {
  constructor(private svc: IngredientGroupsService) {}

  @Get()
  @RequirePermissions('ingredients:read')
  findAll() {
    return this.svc.findAll();
  }

  @Post()
  @RequirePermissions('ingredients:create')
  create(@Body() body: { name: string; base_unit: string; min_stock?: number; note?: string }) {
    return this.svc.create(body);
  }

  @Put(':id')
  @RequirePermissions('ingredients:update')
  update(@Param('id') id: string, @Body() body: { name?: string; base_unit?: string; min_stock?: number | null; note?: string }) {
    return this.svc.update(id, body);
  }
}
