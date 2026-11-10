import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../prisma/prisma.service';
import { BRANDING_KEY, initialsOf, sanitizeBranding } from '../settings/branding';
import { isBusinessProfile } from '../settings/business-profile';
import { seedProfile } from './profile-seed/seed-profile';

export interface SetupDto {
  profile?: string;
  admin?: { email?: string; password?: string; fullName?: string };
  company?: { name?: string; taxCode?: string; address?: string };
  taxRegime?: string;
  brand?: { name?: string; logoUrl?: string; primaryColor?: string };
}

const REGIMES = ['VAT_DEDUCTION', 'HOUSEHOLD'];
const TAX_CODE = /^(\d{10}|\d{13}|\d{10}-\d{3})$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

@Injectable()
export class SetupService {
  private setupTokenWarned = false;

  constructor(private prisma: PrismaService) {}

  /** Cần cài đặt lần đầu khi DB chưa có user nào. */
  async needsSetup(): Promise<boolean> {
    const needs = (await this.prisma.user.count()) === 0;
    if (needs && !process.env.SETUP_TOKEN && !this.setupTokenWarned) {
      this.setupTokenWarned = true;
      console.warn(
        '⚠ SETUP_TOKEN chưa được cấu hình — bất kỳ ai truy cập /setup đều có thể cài đặt hệ thống. ' + 'Đặt SETUP_TOKEN để bảo vệ wizard.',
      );
    }
    return needs;
  }

  async run(dto: SetupDto) {
    if (!(await this.needsSetup())) throw new ConflictException('Hệ thống đã được cài đặt');
    const profile = dto.profile;
    if (!isBusinessProfile(profile)) throw new BadRequestException('Ngành nghề không hợp lệ');
    const email = dto.admin?.email?.trim().toLowerCase();
    const password = dto.admin?.password ?? '';
    const fullName = dto.admin?.fullName?.trim();
    if (!email || !EMAIL.test(email)) throw new BadRequestException('Email admin không hợp lệ');
    if (password.length < 6) throw new BadRequestException('Mật khẩu tối thiểu 6 ký tự');
    if (!fullName) throw new BadRequestException('Vui lòng nhập họ tên admin');
    const companyName = dto.company?.name?.trim();
    if (!companyName) throw new BadRequestException('Vui lòng nhập tên doanh nghiệp');
    const taxCode = dto.company?.taxCode?.trim() || null;
    if (taxCode && !TAX_CODE.test(taxCode)) throw new BadRequestException('Mã số thuế phải có 10 hoặc 13 chữ số');
    const regime = dto.taxRegime ?? 'VAT_DEDUCTION';
    if (!REGIMES.includes(regime)) throw new BadRequestException('Chế độ thuế không hợp lệ');

    await seedProfile(this.prisma, profile);
    // Wizard là nguồn sự thật cho ngành khách chọn (seed chỉ ghi khi chưa có).
    await this.prisma.appSetting.upsert({
      where: { key: 'business_profile' },
      create: { key: 'business_profile', value: profile },
      update: { value: profile },
    });

    await this.prisma.taxSetting.upsert({
      where: { id: 'default' },
      create: { id: 'default', regime, companyName, taxCode, address: dto.company?.address?.trim() || null },
      update: { regime, companyName, taxCode, address: dto.company?.address?.trim() || null },
    });

    const brandName = dto.brand?.name?.trim() || companyName;
    const branding = sanitizeBranding(
      { ...dto.brand, name: brandName, shortName: initialsOf(brandName) },
      { name: brandName, shortName: initialsOf(brandName), logoUrl: '', primaryColor: null },
    );
    await this.prisma.appSetting.upsert({
      where: { key: BRANDING_KEY },
      create: { key: BRANDING_KEY, value: { ...branding } },
      update: { value: { ...branding } },
    });

    const adminRole = await this.prisma.role.findUniqueOrThrow({ where: { code: 'admin' } });
    await this.prisma.user.create({
      data: { email, fullName, passwordHash: await bcrypt.hash(password, 10), userRoles: { create: { roleId: adminRole.id } } },
    });
    return { ok: true };
  }
}
