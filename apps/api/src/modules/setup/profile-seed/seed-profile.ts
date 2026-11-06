import type { PrismaClient } from '@prisma/client';
import type { BusinessProfile } from '../../settings/business-profile';
import { PROFILE_SEEDS } from './profiles';

export const MAIN_WAREHOUSE = { code: 'MAIN', name: 'Kho chính' };

/** Ghi app_settings chỉ khi key chưa có (không đè cấu hình khách đã chỉnh). */
async function setIfAbsent(prisma: PrismaClient, key: string, value: object | string) {
  await prisma.appSetting.upsert({ where: { key }, create: { key, value }, update: {} });
}

/**
 * Seed nền tảng theo ngành: vai trò + quyền, kho chính, thuộc tính, danh mục mẫu,
 * tiền tố chứng từ, cấu hình thuế mặc định. Idempotent (upsert / skipDuplicates).
 * KHÔNG tạo user — wizard hoặc người vận hành tạo admin riêng.
 */
export async function seedProfile(prisma: PrismaClient, profile: BusinessProfile) {
  const data = PROFILE_SEEDS[profile];

  for (const r of data.roles) {
    const role = await prisma.role.upsert({ where: { code: r.code }, create: { code: r.code, name: r.name }, update: {} });
    await prisma.rolePermission.createMany({
      data: r.permissions.map(([resource, action]) => ({ roleId: role.id, resource, action })),
      skipDuplicates: true,
    });
  }

  for (const [ai, attr] of data.attributes.entries()) {
    const a = await prisma.productAttribute.upsert({
      where: { code: attr.code },
      create: { code: attr.code, name: attr.name, sort: ai },
      update: {},
    });
    for (const [vi, val] of attr.values.entries()) {
      await prisma.productAttributeValue.upsert({
        where: { attributeId_value: { attributeId: a.id, value: val.value } },
        create: { attributeId: a.id, value: val.value, code: val.code, sort: vi },
        update: {},
      });
    }
  }

  await prisma.taxSetting.upsert({
    where: { id: 'default' },
    create: { id: 'default', defaultOutputVatRate: data.defaultOutputVatRate, pricesIncludeVat: data.pricesIncludeVat },
    update: {},
  });

  await setIfAbsent(prisma, 'business_profile', profile);
  await setIfAbsent(prisma, 'warehouse_main', MAIN_WAREHOUSE);
  await setIfAbsent(prisma, 'doc_prefixes', data.docPrefixes);
  await setIfAbsent(prisma, 'sample_categories', data.categories);
}
