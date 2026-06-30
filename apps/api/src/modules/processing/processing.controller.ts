import { Controller, Get, Post, Param, Body, Query, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { PermissionsGuard, RequirePermissions } from '../../auth/permissions.guard';
import { ProcessingService } from './processing.service';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('processing')
export class ProcessingController {
  constructor(private svc: ProcessingService) {}

  @Get()
  @RequirePermissions('processing:read')
  findAll(@Query() q: { page?: string; limit?: string; status?: string; orderBy?: string; sort?: string }) {
    return this.svc.findAll(q);
  }

  @Post()
  @RequirePermissions('processing:create')
  create(
    @Req() req,
    @Body() body: { source_ingredient_id: string; source_qty: number; output_ingredient_id: string; output_qty?: number; note?: string },
  ) {
    return this.svc.create(req.user.id, body);
  }

  @Get(':id')
  @RequirePermissions('processing:read')
  getDetail(@Param('id') id: string) {
    return this.svc.getDetail(id);
  }

  @Post(':id/complete')
  @RequirePermissions('processing:complete')
  complete(@Param('id') id: string, @Req() req) {
    return this.svc.complete(id, req.user.id);
  }
}
