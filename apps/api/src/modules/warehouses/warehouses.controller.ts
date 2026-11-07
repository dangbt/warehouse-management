import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { PermissionsGuard, RequirePermissions } from '../../auth/permissions.guard';
import { WarehousesService, type WarehouseInput } from './warehouses.service';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('warehouses')
export class WarehousesController {
  constructor(private svc: WarehousesService) {}

  @Get()
  @RequirePermissions('warehouses:read')
  findAll(@Query() q: { active?: string }) {
    return this.svc.findAll(q);
  }

  @Get(':id')
  @RequirePermissions('warehouses:read')
  findOne(@Param('id') id: string) {
    return this.svc.findOne(id);
  }

  @Post()
  @RequirePermissions('warehouses:create')
  create(@Body() body: WarehouseInput) {
    return this.svc.create(body);
  }

  @Put(':id')
  @RequirePermissions('warehouses:update')
  update(@Param('id') id: string, @Body() body: WarehouseInput) {
    return this.svc.update(id, body);
  }

  @Delete(':id')
  @RequirePermissions('warehouses:delete')
  remove(@Param('id') id: string) {
    return this.svc.remove(id);
  }
}
