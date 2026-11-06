import { NotFoundException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { FeatureGuard, RequireFeature, FEATURE_DISABLED } from './feature.guard';
import { resolveFeatures } from './business-profile';
import type { SettingsService } from './settings.service';
import type { BusinessProfile } from './business-profile';

class Guarded {
  @RequireFeature('recipes')
  gated(this: void) {}
  open(this: void) {}
}

function makeGuard(profile: BusinessProfile, overrides = {}) {
  const settings = { getFeatures: () => Promise.resolve(resolveFeatures(profile, overrides)) } as unknown as SettingsService;
  return new FeatureGuard(new Reflector(), settings);
}
const ctx = (handler: () => void) => ({ getHandler: () => handler, getClass: () => Guarded }) as never;

describe('FeatureGuard', () => {
  it('cho qua khi handler không gắn @RequireFeature', async () => {
    await expect(makeGuard('FASHION').canActivate(ctx(Guarded.prototype.open))).resolves.toBe(true);
  });
  it('FNB bật recipes → cho qua', async () => {
    await expect(makeGuard('FNB').canActivate(ctx(Guarded.prototype.gated))).resolves.toBe(true);
  });
  it('FASHION tắt recipes → 404 FEATURE_DISABLED', async () => {
    const err = await makeGuard('FASHION')
      .canActivate(ctx(Guarded.prototype.gated))
      .catch((e) => e);
    expect(err).toBeInstanceOf(NotFoundException);
    expect(err.getResponse()).toMatchObject({ code: FEATURE_DISABLED, feature: 'recipes' });
  });
  it('override bật lại flag trên profile tắt', async () => {
    await expect(makeGuard('FASHION', { recipes: true }).canActivate(ctx(Guarded.prototype.gated))).resolves.toBe(true);
  });
});
