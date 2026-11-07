import { Global, Module } from '@nestjs/common';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';
import { FeatureGuard } from './feature.guard';
import { BrandingController } from './branding.controller';
import { BrandingService } from './branding.service';

@Global()
@Module({
  controllers: [SettingsController, BrandingController],
  providers: [SettingsService, BrandingService, FeatureGuard],
  exports: [SettingsService, BrandingService, FeatureGuard],
})
export class SettingsModule {}
