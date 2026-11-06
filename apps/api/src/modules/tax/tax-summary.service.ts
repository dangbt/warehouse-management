import { Injectable, BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { TaxReportsService } from './tax-reports.service';
import { parsePeriod } from './period';
import type { TaxRegime } from './vat';
import { computeVatDeduction, computeHousehold } from './summary';

/** Số liệu bên đầu ra/đầu vào rút gọn cho tờ khai VAT khấu trừ. */
export interface SummarySide {
  byRate: { vatRate: string; amountBeforeTax: number; vatAmount: number }[];
  totalBeforeTax: number;
  totalVat: number;
}

export interface VatDeductionSummaryResult {
  regime: 'VAT_DEDUCTION';
  period: { value: string; label: string };
  settings: { companyName: string | null; taxCode: string | null };
  output: SummarySide;
  input: SummarySide;
  carriedForwardIn: number;
  payable: number;
  carryToNext: number;
  /** Số đơn KiotViet chưa tính thuế đầu ra (totalAmount > 0 nhưng snapshot = 0). */
  unsnapshottedOrders: number;
  closed: boolean;
  closedAt: string | null;
}

export interface HouseholdSummaryResult {
  regime: 'HOUSEHOLD';
  period: { value: string; label: string };
  settings: { companyName: string | null; taxCode: string | null };
  revenue: number;
  yearToDateRevenue: number;
  vatPercent: number;
  pitPercent: number;
  exemptThreshold: number;
  belowExemptThreshold: boolean;
  vat: number;
  pit: number;
  closed: boolean;
  closedAt: string | null;
}

export type TaxSummaryResult = VatDeductionSummaryResult | HouseholdSummaryResult;

@Injectable()
export class TaxSummaryService {
  constructor(
    private prisma: PrismaService,
    private reports: TaxReportsService,
  ) {}

  /**
   * Tổng hợp thuế của một kỳ để lập tờ khai, theo chế độ thuế đang cấu hình.
   *
   * Kỳ đã chốt (`TaxPeriodClose`) ⇒ trả snapshot cố định kèm `closed: true`.
   * Chưa chốt ⇒ tính động, tái dùng query của `tax-reports.service`.
   *
   * @param carriedForwardOverride Ghi đè "thuế kỳ trước chuyển sang" (VAT_DEDUCTION);
   *   nếu không truyền, lấy `carryToNext` của kỳ chốt liền trước (nếu có), mặc định 0.
   */
  async summary(periodValue: string | undefined, carriedForwardOverride?: number): Promise<TaxSummaryResult> {
    const period = parsePeriod(periodValue);
    const value = periodValue!;

    const closed = await this.prisma.taxPeriodClose.findUnique({ where: { period: value } });
    if (closed) {
      // Trả nguyên snapshot cố định tại thời điểm chốt.
      const snap = closed.snapshot as unknown as TaxSummaryResult;
      return { ...snap, closed: true, closedAt: closed.closedAt.toISOString() };
    }

    const setting = await this.prisma.taxSetting.findUnique({ where: { id: 'default' } });
    const regime: TaxRegime = (setting?.regime as TaxRegime) ?? 'VAT_DEDUCTION';
    const settings = { companyName: setting?.companyName ?? null, taxCode: setting?.taxCode ?? null };

    if (regime === 'HOUSEHOLD') {
      return this.buildHousehold(value, period.label, settings, setting);
    }
    return this.buildVatDeduction(value, period.label, settings, carriedForwardOverride);
  }

  /** Chế độ VAT khấu trừ: tái dùng outputRevenue + inputInvoiceRegister. */
  private async buildVatDeduction(
    value: string,
    label: string,
    settings: { companyName: string | null; taxCode: string | null },
    carriedForwardOverride?: number,
  ): Promise<VatDeductionSummaryResult> {
    const [outputReport, inputReport] = await Promise.all([this.reports.outputRevenue(value), this.reports.inputInvoiceRegister(value)]);

    const output: SummarySide = {
      byRate: outputReport.groups.map((g) => ({ vatRate: g.vatRate, amountBeforeTax: g.amountBeforeTax, vatAmount: g.vatAmount })),
      totalBeforeTax: outputReport.total.amountBeforeTax,
      totalVat: outputReport.total.vatAmount,
    };
    const input: SummarySide = {
      byRate: inputReport.groups.map((g) => ({ vatRate: g.vatRate, amountBeforeTax: g.subtotal, vatAmount: g.vatAmount })),
      totalBeforeTax: inputReport.total.subtotal,
      totalVat: inputReport.total.vatAmount,
    };

    const carriedForwardIn = carriedForwardOverride ?? (await this.carriedForwardFromPreviousClose(value));

    const calc = computeVatDeduction({
      outputVat: output.totalVat,
      inputVat: input.totalVat,
      carriedForwardIn,
    });

    const unsnapshottedOrders = await this.countUnsnapshottedOrders(value);

    return {
      regime: 'VAT_DEDUCTION',
      period: { value, label },
      settings,
      output,
      input,
      carriedForwardIn: calc.carriedForwardIn,
      payable: calc.payable,
      carryToNext: calc.carryToNext,
      unsnapshottedOrders,
      closed: false,
      closedAt: null,
    };
  }

  /** Chế độ hộ kinh doanh: doanh thu kỳ + luỹ kế năm, tính % và cờ miễn thuế. */
  private async buildHousehold(
    value: string,
    label: string,
    settings: { companyName: string | null; taxCode: string | null },
    setting: { householdVatPercent: unknown; householdPitPercent: unknown; householdExemptThreshold: unknown } | null,
  ): Promise<HouseholdSummaryResult> {
    const period = parsePeriod(value);
    // Doanh thu kỳ = Σ totalAmount đơn KiotViet trong kỳ (không phụ thuộc snapshot thuế).
    const [periodAgg, ytdAgg] = await Promise.all([
      this.prisma.kiotVietOrder.aggregate({
        _sum: { totalAmount: true },
        where: { orderDate: { gte: period.from, lte: period.to } },
      }),
      this.prisma.kiotVietOrder.aggregate({
        _sum: { totalAmount: true },
        where: { orderDate: { gte: this.startOfYear(period.from), lte: period.to } },
      }),
    ]);

    const revenue = Number(periodAgg._sum.totalAmount ?? 0);
    const yearToDateRevenue = Number(ytdAgg._sum.totalAmount ?? 0);
    const vatPercent = Number(setting?.householdVatPercent ?? 0);
    const pitPercent = Number(setting?.householdPitPercent ?? 0);
    const exemptThreshold = Number(setting?.householdExemptThreshold ?? 0);

    const calc = computeHousehold({ revenue, yearToDateRevenue, vatPercent, pitPercent, exemptThreshold });

    return {
      regime: 'HOUSEHOLD',
      period: { value, label },
      settings,
      revenue: calc.revenue,
      yearToDateRevenue: calc.yearToDateRevenue,
      vatPercent,
      pitPercent,
      exemptThreshold,
      belowExemptThreshold: calc.belowExemptThreshold,
      vat: calc.vat,
      pit: calc.pit,
      closed: false,
      closedAt: null,
    };
  }

  /** Chốt kỳ: lưu snapshot số liệu hiện tại. Không cho chốt khi còn đơn chưa tính thuế. */
  async closePeriod(
    periodValue: string | undefined,
    userId: string | undefined,
    carriedForwardOverride?: number,
  ): Promise<TaxSummaryResult> {
    const period = parsePeriod(periodValue);
    const value = periodValue!;

    const existing = await this.prisma.taxPeriodClose.findUnique({ where: { period: value } });
    if (existing) {
      throw new ConflictException(`Kỳ ${period.label} đã được chốt`);
    }

    const summary = await this.summary(value, carriedForwardOverride);

    if (summary.regime === 'VAT_DEDUCTION' && summary.unsnapshottedOrders > 0) {
      throw new BadRequestException(
        `Còn ${summary.unsnapshottedOrders} đơn chưa tính thuế đầu ra — hãy bấm "Tính lại" ở trang Doanh thu theo thuế suất trước khi chốt kỳ`,
      );
    }

    const carriedForwardIn = summary.regime === 'VAT_DEDUCTION' ? summary.carriedForwardIn : 0;

    await this.prisma.taxPeriodClose.create({
      data: {
        period: value,
        regime: summary.regime,
        carriedForwardIn,
        snapshot: summary as unknown as Prisma.InputJsonValue,
        closedById: userId ?? null,
      },
    });

    return { ...summary, closed: true, closedAt: new Date().toISOString() };
  }

  /** Mở lại kỳ đã chốt: xoá snapshot để tính lại động. */
  async reopenPeriod(periodValue: string | undefined): Promise<{ period: string; reopened: boolean }> {
    const period = parsePeriod(periodValue);
    const value = periodValue!;
    const existing = await this.prisma.taxPeriodClose.findUnique({ where: { period: value } });
    if (!existing) {
      throw new NotFoundException(`Kỳ ${period.label} chưa được chốt`);
    }
    await this.prisma.taxPeriodClose.delete({ where: { period: value } });
    return { period: value, reopened: true };
  }

  /**
   * Lấy thuế còn được khấu trừ chuyển sang từ kỳ chốt liền trước (nếu có).
   * Đọc `carryToNext` đã lưu trong snapshot của kỳ chốt gần nhất trước kỳ hiện tại.
   */
  private async carriedForwardFromPreviousClose(currentPeriod: string): Promise<number> {
    const previous = await this.prisma.taxPeriodClose.findFirst({
      where: { period: { lt: currentPeriod } },
      orderBy: { period: 'desc' },
    });
    if (!previous) return 0;
    const snap = previous.snapshot as unknown as { carryToNext?: number };
    return Math.max(0, Number(snap?.carryToNext ?? 0));
  }

  /**
   * Đếm đơn KiotViet trong kỳ chưa tính thuế đầu ra: có tiền (`totalAmount > 0`)
   * nhưng snapshot thuế rỗng (`amountBeforeTax = 0 AND vatAmount = 0`).
   */
  private async countUnsnapshottedOrders(periodValue: string): Promise<number> {
    const period = parsePeriod(periodValue);
    return this.prisma.kiotVietOrder.count({
      where: {
        orderDate: { gte: period.from, lte: period.to },
        totalAmount: { gt: 0 },
        amountBeforeTax: 0,
        vatAmount: 0,
      },
    });
  }

  /** 00:00:00 giờ VN ngày 01/01 của năm chứa `date`, quy về UTC (UTC+7). */
  private startOfYear(date: Date): Date {
    // `date` là mốc from của kỳ (đã là UTC tương ứng 00:00 giờ VN ngày đầu kỳ).
    // Lấy năm theo giờ VN rồi dựng 01/01 00:00 giờ VN.
    const vn = new Date(date.getTime() + 7 * 60 * 60 * 1000);
    const year = vn.getUTCFullYear();
    return new Date(Date.UTC(year, 0, 1, 0, 0, 0, 0) - 7 * 60 * 60 * 1000);
  }
}
