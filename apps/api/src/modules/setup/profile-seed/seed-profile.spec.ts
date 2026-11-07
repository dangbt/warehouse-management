import type { PrismaClient } from '@prisma/client';
import { seedProfile } from './seed-profile';
import { PROFILE_SEEDS } from './profiles';

/** Prisma giả lưu theo khoá tự nhiên để kiểm tra chạy 2 lần không nhân đôi. */
function fakePrisma() {
  const roles = new Map<string, { id: string }>();
  const perms = new Set<string>();
  const attrs = new Map<string, { id: string }>();
  const values = new Set<string>();
  const settings = new Map<string, unknown>();
  const prisma = {
    role: {
      upsert: ({ where, create }: { where: { code: string }; create: { code: string } }) => {
        if (!roles.has(where.code)) roles.set(where.code, { id: create.code });
        return Promise.resolve(roles.get(where.code)!);
      },
    },
    rolePermission: {
      createMany: ({ data }: { data: { roleId: string; resource: string; action: string }[] }) => {
        data.forEach((d) => perms.add(`${d.roleId}/${d.resource}/${d.action}`));
        return Promise.resolve();
      },
    },
    productAttribute: {
      upsert: ({ where, create }: { where: { code: string }; create: { code: string } }) => {
        if (!attrs.has(where.code)) attrs.set(where.code, { id: create.code });
        return Promise.resolve(attrs.get(where.code)!);
      },
    },
    productAttributeValue: {
      upsert: ({ create }: { create: { attributeId: string; value: string } }) => {
        values.add(`${create.attributeId}/${create.value}`);
        return Promise.resolve();
      },
    },
    taxSetting: { upsert: () => Promise.resolve() },
    appSetting: {
      upsert: ({ where, create }: { where: { key: string }; create: { value: unknown } }) => {
        if (!settings.has(where.key)) settings.set(where.key, create.value);
        return Promise.resolve();
      },
    },
  };
  return { prisma: prisma as unknown as PrismaClient, counts: () => [roles.size, perms.size, attrs.size, values.size, settings.size] };
}

describe('seedProfile', () => {
  it.each(['FNB', 'FASHION', 'RETAIL'] as const)('%s: chạy 2 lần không tạo trùng', async (profile) => {
    const { prisma, counts } = fakePrisma();
    await seedProfile(prisma, profile);
    const first = counts();
    await seedProfile(prisma, profile);
    expect(counts()).toEqual(first);
    expect(first[0]).toBe(PROFILE_SEEDS[profile].roles.length);
  });

  it('FASHION có Size (XS–XXL, 28–36) và Màu', async () => {
    const { prisma, counts } = fakePrisma();
    await seedProfile(prisma, 'FASHION');
    const [, , attrs, values] = counts();
    expect(attrs).toBe(2);
    expect(values).toBe(6 + 9 + 10);
  });
});
