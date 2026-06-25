import { Controller, Get, Post, Put, Param, Body, Query, UseGuards, Req } from '@nestjs/common';
import { ImportOrdersService } from './import-orders.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('import-orders')
export class ImportOrdersController {
  constructor(private svc: ImportOrdersService) {}

  @Get()
  findAll(@Query() q: { page?: string; limit?: string; status?: string }) {
    return this.svc.findAll(q);
  }

  @Post()
  create(@Req() req, @Body() body: { supplier_id: string; note?: string; items: { ingredient_id: string; quantity: number; unit_price: number; expiry_date?: string }[] }) {
    return this.svc.create(req.user.id, body);
  }

  @Put(':id/approve')
  approve(@Param('id') id: string, @Req() req) {
    return this.svc.approve(id, req.user.id);
  }

  @Put(':id/reject')
  reject(@Param('id') id: string, @Body() body: { reason?: string }) {
    return this.svc.reject(id, body.reason);
  }
}
