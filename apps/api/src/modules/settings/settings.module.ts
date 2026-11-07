import { Global, Module } from '@nestjs/common';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';
import { FeatureGuard } from './feature.guard';

@Global()
@Module({
  controllers: [SettingsController],
  providers: [SettingsService, FeatureGuard],
  exports: [SettingsService, FeatureGuard],
})
export class SettingsModule {}
