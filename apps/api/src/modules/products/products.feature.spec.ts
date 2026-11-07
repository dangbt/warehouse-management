/* eslint-disable @typescript-eslint/require-await -- mock giả lập trả Promise, không cần await */
import { ExecutionContext, NotFoundException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { FeatureGuard, FEATURE_DISABLED } from '../settings/feature.guard';
import { ProductsController, AttributesController } from './products.controller';
import type { SettingsService } from '../settings/settings.service';

describe('API products theo flag product_variants', () => {
  const ctxFor = (cls: new (...a: never[]) => unknown, handler: string) =>
    ({ getClass: () => cls, getHandler: () => (cls.prototype as Record<string, () => void>)[handler] }) as unknown as ExecutionContext;
  const guard = (on: boolean) =>
    new FeatureGuard(new Reflector(), { getFeatures: async () => ({ flags: { product_variants: on } }) } as unknown as SettingsService);

  it.each([
    [ProductsController, 'findAll'],
    [ProductsController, 'generate'],
    [AttributesController, 'list'],
  ])('flag tắt → 404 FEATURE_DISABLED (%p.%s)', async (cls, handler) => {
    await expect(guard(false).canActivate(ctxFor(cls as never, handler))).rejects.toMatchObject({
      response: { code: FEATURE_DISABLED, feature: 'product_variants' },
    });
    await expect(guard(false).canActivate(ctxFor(cls as never, handler))).rejects.toBeInstanceOf(NotFoundException);
  });

  it('flag bật → cho qua', async () => {
    await expect(guard(true).canActivate(ctxFor(ProductsController as never, 'findAll'))).resolves.toBe(true);
  });
});
