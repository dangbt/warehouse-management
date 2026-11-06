import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { isBusinessProfile, profileFromEnv, resolveFeatures, sanitizeOverrides } from './business-profile';
import type { BusinessProfile, FeatureOverrides, FeaturesState } from './business-profile';

const PROFILE_KEY = 'business_profile';
const OVERRIDES_KEY = 'feature_overrides';

export interface UpdateFeaturesDto {
  profile?: string;
  overrides?: Record<string, unknown>;
}

@Injectable()
export class SettingsService {
  private readonly logger = new Logger(SettingsService.name);

  constructor(private prisma: PrismaService) {}

  /** Profile trong DB; chưa có thì lấy từ env BUSINESS_PROFILE (mặc định FNB). */
  async getFeatures(): Promise<FeaturesState> {
    // Bảng chưa migrate / DB lỗi → dùng mặc định theo env, không làm sập các module bị gate.
    const rows: { key: string; value: unknown }[] = await this.prisma.appSetting
      .findMany({ where: { key: { in: [PROFILE_KEY, OVERRIDES_KEY] } } })
      .catch((e: Error) => {
        this.logger.warn(`Không đọc được app_settings, dùng mặc định theo env: ${e.message.split('\n').pop()}`);
        return [];
      });
    const profileRow = rows.find((r) => r.key === PROFILE_KEY)?.value;
    const profile: BusinessProfile = isBusinessProfile(profileRow) ? profileRow : profileFromEnv(process.env.BUSINESS_PROFILE);
    const overrides = sanitizeOverrides(rows.find((r) => r.key === OVERRIDES_KEY)?.value);
    return resolveFeatures(profile, overrides);
  }

  async updateFeatures(dto: UpdateFeaturesDto, userId: string | null, meta: { ip?: string; userAgent?: string } = {}) {
    if (dto.profile !== undefined && !isBusinessProfile(dto.profile)) throw new BadRequestException('Profile không hợp lệ');
    const before = await this.getFeatures();
    const profile = dto.profile ?? before.profile;
    const overrides: FeatureOverrides = dto.overrides !== undefined ? sanitizeOverrides(dto.overrides) : before.overrides;
    const next = resolveFeatures(profile, overrides);
    await this.prisma.$transaction([
      this.prisma.appSetting.upsert({
        where: { key: PROFILE_KEY },
        create: { key: PROFILE_KEY, value: profile },
        update: { value: profile },
      }),
      this.prisma.appSetting.upsert({
        where: { key: OVERRIDES_KEY },
        create: { key: OVERRIDES_KEY, value: overrides },
        update: { value: overrides },
      }),
      this.prisma.auditLog.create({
        data: {
          userId,
          action: 'UPDATE',
          resource: 'settings',
          resourceId: 'features',
          oldValues: { profile: before.profile, overrides: before.overrides },
          newValues: { profile: next.profile, overrides: next.overrides },
          ipAddress: meta.ip,
          userAgent: meta.userAgent,
        },
      }),
    ]);
    return next;
  }
}
