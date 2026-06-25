import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { IngredientsService } from './ingredients.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('ingredients')
export class IngredientsController {
  constructor(private svc: IngredientsService) {}

  @Get()
  findAll(@Query() query: { page?: string; limit?: string; category?: string; low_stock?: string; search?: string }) {
    return this.svc.findAll(query);
  }

  @Post()
  create(@Body() body: { name: string; unit: string; category: string; cost_per_unit: number; min_stock: number }) {
    return this.svc.create(body);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() body: { name?: string; unit?: string; category?: string; cost_per_unit?: number; min_stock?: number }) {
    return this.svc.update(id, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.svc.remove(id);
  }
}
