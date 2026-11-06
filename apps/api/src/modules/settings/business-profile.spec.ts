import { profileFromEnv, resolveFeatures, sanitizeOverrides, PROFILE_FEATURES, FEATURE_KEYS } from './business-profile';

describe('business-profile', () => {
  it('env thiếu/sai → FNB', () => {
    expect(profileFromEnv(undefined)).toBe('FNB');
    expect(profileFromEnv('xyz')).toBe('FNB');
    expect(profileFromEnv(' fashion ')).toBe('FASHION');
  });
  it('FNB giữ nguyên toàn bộ module hiện có', () => {
    const f = PROFILE_FEATURES.FNB;
    expect([f.recipes, f.menu, f.processing, f.kiotviet_recipe_deduct, f.sales_channels]).toEqual([true, true, true, true, true]);
  });
  it('mọi profile đủ flag', () => {
    for (const p of Object.values(PROFILE_FEATURES)) expect(Object.keys(p).sort()).toEqual([...FEATURE_KEYS].sort());
  });
  it('override thắng mặc định, bỏ key rác', () => {
    expect(sanitizeOverrides({ recipes: true, foo: true, menu: 'x' })).toEqual({ recipes: true });
    expect(resolveFeatures('FASHION', { recipes: true }).flags.recipes).toBe(true);
  });
});
