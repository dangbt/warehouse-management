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

@RequireFeature('sales_channels')
class Channel {
  @RequireFeature('kiotviet_recipe_deduct')
  deduct(this: void) {}
}

function makeGuard(profile: BusinessProfile, overrides = {}) {
  const settings = { getFeatures: () => Promise.resolve(resolveFeatures(profile, overrides)) } as unknown as SettingsService;
  return new FeatureGuard(new Reflector(), settings);
}
const ctx = (handler: () => void, cls: unknown = Guarded) => ({ getHandler: () => handler, getClass: () => cls }) as never;

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
  it('class + handler: tắt sales_channels dù deduct bật → 404', async () => {
    const guard = makeGuard('FNB', { sales_channels: false });
    const err = await guard.canActivate(ctx(Channel.prototype.deduct, Channel)).catch((e) => e);
    expect(err.getResponse()).toMatchObject({ code: FEATURE_DISABLED, feature: 'sales_channels' });
  });
  it('class + handler: tắt kiotviet_recipe_deduct → 404', async () => {
    const err = await makeGuard('FNB', { kiotviet_recipe_deduct: false })
      .canActivate(ctx(Channel.prototype.deduct, Channel))
      .catch((e) => e);
    expect(err.getResponse()).toMatchObject({ feature: 'kiotviet_recipe_deduct' });
  });
  it('class + handler: cả hai bật → cho qua', async () => {
    await expect(makeGuard('FNB').canActivate(ctx(Channel.prototype.deduct, Channel))).resolves.toBe(true);
  });
});
