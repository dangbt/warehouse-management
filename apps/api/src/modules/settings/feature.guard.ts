import { CanActivate, ExecutionContext, Injectable, NotFoundException, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SettingsService } from './settings.service';
import type { FeatureKey } from './business-profile';

export const FEATURE_KEY = 'required_feature';
export const FEATURE_DISABLED = 'FEATURE_DISABLED';

/** Đánh dấu controller/handler chỉ hoạt động khi feature flag bật. Dùng cùng FeatureGuard. */
export const RequireFeature = (feature: FeatureKey) => SetMetadata(FEATURE_KEY, feature);

@Injectable()
export class FeatureGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private settings: SettingsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const feature = this.reflector.getAllAndOverride<FeatureKey | undefined>(FEATURE_KEY, [context.getHandler(), context.getClass()]);
    if (!feature) return true;
    const { flags } = await this.settings.getFeatures();
    if (!flags[feature]) {
      throw new NotFoundException({
        statusCode: 404,
        code: FEATURE_DISABLED,
        feature,
        message: 'Chức năng không được bật cho ngành nghề này',
      });
    }
    return true;
  }
}
