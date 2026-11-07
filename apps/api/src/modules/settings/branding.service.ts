import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BRANDING_KEY, DEFAULT_BRANDING, sanitizeBranding } from './branding';
import type { Branding } from './branding';

@Injectable()
export class BrandingService {
  constructor(private prisma: PrismaService) {}

  async get(): Promise<Branding> {
    const row = await this.prisma.appSetting.findUnique({ where: { key: BRANDING_KEY } }).catch(() => null);
    return row ? sanitizeBranding(row.value) : DEFAULT_BRANDING;
  }

  async update(body: unknown): Promise<Branding> {
    const next = sanitizeBranding(body, await this.get());
    await this.prisma.appSetting.upsert({
      where: { key: BRANDING_KEY },
      create: { key: BRANDING_KEY, value: { ...next } },
      update: { value: { ...next } },
    });
    return next;
  }
}
