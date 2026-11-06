import { Body, Controller, Get, Put, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { PermissionsGuard, RequirePermissions } from '../../auth/permissions.guard';
import { SettingsService } from './settings.service';
import type { UpdateFeaturesDto } from './settings.service';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('settings')
export class SettingsController {
  constructor(private svc: SettingsService) {}

  /** Mọi user đã đăng nhập đọc được (web cần để ẩn/hiện menu). */
  @Get('features')
  getFeatures() {
    return this.svc.getFeatures();
  }

  @Put('features')
  @RequirePermissions('settings:update')
  updateFeatures(@Body() body: UpdateFeaturesDto, @Req() req: { user?: { id?: string }; headers: Record<string, string | undefined> }) {
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.headers['x-real-ip'];
    return this.svc.updateFeatures(body, req.user?.id ?? null, { ip, userAgent: req.headers['user-agent'] });
  }
}
