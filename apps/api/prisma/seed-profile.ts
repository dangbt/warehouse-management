/**
 * Seed nền tảng cho khách mới theo ngành. Idempotent.
 * Chạy (từ apps/api):  npm run seed:profile -- --profile=FASHION
 *   --profile=FNB|FASHION|RETAIL   (mặc định: env BUSINESS_PROFILE, rồi FNB)
 *   --no-data                       FNB: bỏ qua seed Mâm Vị + recipes
 */
import { PrismaClient } from '@prisma/client';
import { execFileSync } from 'child_process';
import { isBusinessProfile, profileFromEnv } from '../src/modules/settings/business-profile';
import { seedProfile } from '../src/modules/setup/profile-seed/seed-profile';

const arg = process.argv
  .find((a) => a.startsWith('--profile='))
  ?.split('=')[1]
  ?.toUpperCase();
if (arg !== undefined && !isBusinessProfile(arg)) {
  console.error(`Profile không hợp lệ: ${arg} (FNB | FASHION | RETAIL)`);
  process.exit(1);
}
const profile = arg && isBusinessProfile(arg) ? arg : profileFromEnv(process.env.BUSINESS_PROFILE);

const prisma = new PrismaClient();

async function main() {
  await seedProfile(prisma, profile);
  console.log(`✅ Seed nền tảng profile ${profile} xong`);
  if (profile === 'FNB' && !process.argv.includes('--no-data')) {
    // Giữ seed hiện có: nguyên liệu Mâm Vị rồi công thức (cùng idempotent upsert).
    for (const script of ['prisma/seed-mamvi.ts', 'prisma/seed-recipes.ts']) {
      execFileSync('npx', ['tsx', script], { stdio: 'inherit' });
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
