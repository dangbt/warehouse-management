import { CanActivate, ExecutionContext, Injectable, NotFoundException, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SettingsService } from './settings.service';
import type { FeatureKey } from './business-profile';

export const FEATURE_KEY = 'required_feature';
export const FEATURE_DISABLED = 'FEATURE_DISABLED';

/** Đánh dấu controller/handler chỉ hoạt động khi feature flag bật. Dùng cùng FeatureGuard. */
export const RequireFeature = (...features: FeatureKey[]) => SetMetadata(FEATURE_KEY, features);

@Injectable()
export class FeatureGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private settings: SettingsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Gộp flag của class + handler: phải bật TẤT CẢ mới cho qua.
    const required = this.reflector.getAllAndMerge<FeatureKey[]>(FEATURE_KEY, [context.getHandler(), context.getClass()]) ?? [];
    if (required.length === 0) return true;
    const { flags } = await this.settings.getFeatures();
    const feature = required.find((f) => !flags[f]);
    if (feature) {
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
