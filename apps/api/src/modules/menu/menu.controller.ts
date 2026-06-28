import { Controller, Get, Post, Put, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { PermissionsGuard, RequirePermissions } from '../../auth/permissions.guard';
import { MenuService } from './menu.service';

type MenuBody = {
  name?: string;
  price?: number;
  category?: string;
  kiotviet_product_id?: string | null;
  inventory_mode?: 'RECIPE' | 'DIRECT' | 'NONE' | null;
  direct_ingredient_id?: string | null;
  is_active?: boolean;
};

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('menu-items')
export class MenuController {
  constructor(private svc: MenuService) {}

  @Get()
  @RequirePermissions('recipes:read')
  findAll() {
    return this.svc.findAll();
  }

  @Post()
  @RequirePermissions('recipes:create')
  create(@Body() body: MenuBody & { name: string; price: number; category: string }) {
    return this.svc.create(body);
  }

  @Put(':id')
  @RequirePermissions('recipes:update')
  update(@Param('id') id: string, @Body() body: MenuBody) {
    return this.svc.update(id, body);
  }
}
