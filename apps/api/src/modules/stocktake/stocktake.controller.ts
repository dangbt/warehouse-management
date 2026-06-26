import { Controller, Get, Post, Put, Param, Body, Query, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { PermissionsGuard, RequirePermissions } from '../../auth/permissions.guard';
import { StocktakeService } from './stocktake.service';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('stocktake')
export class StocktakeController {
  constructor(private service: StocktakeService) {}

  @Get()
  @RequirePermissions('stocktake:read')
  findAll(@Query() q: { page?: string; limit?: string }) {
    return this.service.findAll(q);
  }

  @Post()
  @RequirePermissions('stocktake:create')
  create(@Req() req, @Body() body: { note?: string }) {
    return this.service.create(req.user.id, body);
  }

  @Get(':id')
  @RequirePermissions('stocktake:read')
  getDetail(@Param('id') id: string) {
    return this.service.getDetail(id);
  }

  @Put(':id/items')
  @RequirePermissions('stocktake:create')
  updateItems(@Param('id') id: string, @Body() body: { items: { ingredientId: string; actualQty: number; note?: string }[] }) {
    return this.service.updateItems(id, body);
  }

  @Post(':id/complete')
  @RequirePermissions('stocktake:complete')
  complete(@Param('id') id: string, @Req() req) {
    return this.service.complete(id, req.user.id);
  }
}
