import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { VAT_RATES } from './vat';

const VALID_REGIMES = ['VAT_DEDUCTION', 'HOUSEHOLD'];
const VALID_PERIOD_TYPES = ['MONTH', 'QUARTER'];

const DEFAULT_ID = 'default';

export interface UpdateTaxSettingDto {
  regime?: string;
  companyName?: string | null;
  taxCode?: string | null;
  address?: string | null;
  periodType?: string;
  defaultOutputVatRate?: string;
  pricesIncludeVat?: boolean;
  householdVatPercent?: number;
  householdPitPercent?: number;
  householdExemptThreshold?: number;
}

@Injectable()
export class TaxService {
  constructor(private prisma: PrismaService) {}

  async getSettings() {
    const existing = await this.prisma.taxSetting.findUnique({ where: { id: DEFAULT_ID } });
    if (existing) return existing;
    // Tự tạo dòng cấu hình mặc định nếu chưa có.
    return this.prisma.taxSetting.create({ data: { id: DEFAULT_ID } });
  }

  async updateSettings(body: UpdateTaxSettingDto) {
    if (body.regime !== undefined && !VALID_REGIMES.includes(body.regime)) {
      throw new BadRequestException('Chế độ thuế không hợp lệ');
    }
    if (body.periodType !== undefined && !VALID_PERIOD_TYPES.includes(body.periodType)) {
      throw new BadRequestException('Kỳ kê khai không hợp lệ');
    }
    if (body.defaultOutputVatRate !== undefined && !(VAT_RATES as readonly string[]).includes(body.defaultOutputVatRate)) {
      throw new BadRequestException('Thuế suất mặc định không hợp lệ');
    }

    this.validatePercent(body.householdVatPercent, 'Tỷ lệ % GTGT');
    this.validatePercent(body.householdPitPercent, 'Tỷ lệ % TNCN');

    if (body.householdExemptThreshold !== undefined && (isNaN(body.householdExemptThreshold) || body.householdExemptThreshold < 0)) {
      throw new BadRequestException('Ngưỡng doanh thu miễn thuế không hợp lệ');
    }

    if (body.taxCode) {
      // Cho phép dạng 10 hoặc 13 chữ số, hoặc 10 chữ số + '-' + 3 chữ số (đơn vị phụ thuộc).
      const normalized = body.taxCode.trim();
      const valid = /^\d{10}$/.test(normalized) || /^\d{13}$/.test(normalized) || /^\d{10}-\d{3}$/.test(normalized);
      if (!valid) {
        throw new BadRequestException('Mã số thuế phải có 10 hoặc 13 chữ số (cho phép dạng 0123456789-001)');
      }
    }

    const data: UpdateTaxSettingDto = {};
    if (body.regime !== undefined) data.regime = body.regime;
    if (body.companyName !== undefined) data.companyName = body.companyName || null;
    if (body.taxCode !== undefined) data.taxCode = body.taxCode ? body.taxCode.trim() : null;
    if (body.address !== undefined) data.address = body.address || null;
    if (body.periodType !== undefined) data.periodType = body.periodType;
    if (body.defaultOutputVatRate !== undefined) data.defaultOutputVatRate = body.defaultOutputVatRate;
    if (body.pricesIncludeVat !== undefined) data.pricesIncludeVat = body.pricesIncludeVat;
    if (body.householdVatPercent !== undefined) data.householdVatPercent = body.householdVatPercent;
    if (body.householdPitPercent !== undefined) data.householdPitPercent = body.householdPitPercent;
    if (body.householdExemptThreshold !== undefined) data.householdExemptThreshold = body.householdExemptThreshold;

    return this.prisma.taxSetting.upsert({
      where: { id: DEFAULT_ID },
      update: data,
      create: { id: DEFAULT_ID, ...data },
    });
  }

  private validatePercent(value: number | undefined, label: string) {
    if (value === undefined) return;
    if (isNaN(value) || value < 0 || value > 100) {
      throw new BadRequestException(`${label} phải nằm trong khoảng 0–100`);
    }
  }
}
