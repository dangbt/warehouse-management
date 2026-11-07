import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { PermissionsGuard, RequirePermissions } from '../../auth/permissions.guard';
import { BrandingService } from './branding.service';

@Controller('settings/branding')
export class BrandingController {
  constructor(private svc: BrandingService) {}

  /** Công khai: trang đăng nhập cần tên/logo trước khi có token. */
  @Get()
  get() {
    return this.svc.get();
  }

  @Put()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('settings:update')
  update(@Body() body: unknown) {
    return this.svc.update(body);
  }
}
