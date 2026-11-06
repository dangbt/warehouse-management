import { Injectable, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export const VOUCHER_TYPES = ['IMPORT', 'EXPORT', 'RETURN', 'STOCKTAKE', 'PROCESSING'] as const;
export type VoucherType = (typeof VOUCHER_TYPES)[number];

export const VOUCHER_NO_DUPLICATE = 'VOUCHER_NO_DUPLICATE';

const DEFAULT_PREFIX: Record<VoucherType, string> = {
  IMPORT: 'NK',
  EXPORT: 'XK',
  RETURN: 'TH',
  STOCKTAKE: 'KK',
  PROCESSING: 'CB',
};

/** Ghép tiền tố + số thứ tự đệm 0 theo số chữ số cấu hình. */
export function formatVoucherNo(prefix: string, seq: number, digits: number): string {
  return `${prefix}${String(seq).padStart(digits, '0')}`;
}

/** Số thứ tự lớn nhất trong các số chứng từ có dạng `${prefix}<số>`; 0 nếu chưa có. */
export function maxSequence(prefix: string, nos: string[]): number {
  let max = 0;
  for (const no of nos) {
    if (!no.startsWith(prefix)) continue;
    const tail = no.slice(prefix.length);
    if (/^\d+$/.test(tail)) max = Math.max(max, Number(tail));
  }
  return max;
}

/** Parse ngày chứng từ (ISO). Bỏ trống ⇒ hiện tại. */
export function parseVoucherDate(input?: string): Date {
  if (!input) return new Date();
  const d = new Date(input);
  if (isNaN(d.getTime())) throw new BadRequestException('Ngày chứng từ không hợp lệ');
  return d;
}

@Injectable()
export class VoucherService {
  constructor(private prisma: PrismaService) {}

  isValidType(type: string): type is VoucherType {
    return (VOUCHER_TYPES as readonly string[]).includes(type);
  }

  async getConfigs() {
    const rows = await this.prisma.voucherConfig.findMany();
    return VOUCHER_TYPES.map((type) => {
      const r = rows.find((x) => x.type === type);
      return { type, prefix: r?.prefix ?? DEFAULT_PREFIX[type], digits: r?.digits ?? 5 };
    });
  }

  updateConfig(type: string, body: { prefix?: string; digits?: number }) {
    if (!this.isValidType(type)) throw new BadRequestException('Loại chứng từ không hợp lệ');
    const prefix = (body.prefix ?? '').trim().toUpperCase();
    if (!/^[A-Z0-9_-]{1,10}$/.test(prefix)) throw new BadRequestException('Tiền tố không hợp lệ (1-10 ký tự A-Z, 0-9)');
    const digits = Number(body.digits ?? 5);
    if (!Number.isInteger(digits) || digits < 1 || digits > 10) throw new BadRequestException('Số chữ số phải từ 1 đến 10');
    return this.prisma.voucherConfig.upsert({ where: { type }, update: { prefix, digits }, create: { type, prefix, digits } });
  }

  /** Số chứng từ tiếp theo = max số thứ tự hiện có theo tiền tố + 1. */
  async nextNo(type: VoucherType): Promise<string> {
    const cfg = (await this.getConfigs()).find((c) => c.type === type)!;
    const nos = await this.listNos(type, cfg.prefix);
    return formatVoucherNo(cfg.prefix, maxSequence(cfg.prefix, nos) + 1, cfg.digits);
  }

  /** `count` số chứng từ liên tiếp tiếp theo (dùng khi tạo hàng loạt). */
  async nextNos(type: VoucherType, count: number): Promise<string[]> {
    const cfg = (await this.getConfigs()).find((c) => c.type === type)!;
    const start = maxSequence(cfg.prefix, await this.listNos(type, cfg.prefix)) + 1;
    return Array.from({ length: count }, (_, i) => formatVoucherNo(cfg.prefix, start + i, cfg.digits));
  }

  /** Kiểm tra số chứng từ nhập tay đã tồn tại chưa. */
  hasNo(type: VoucherType, no: string): Promise<boolean> {
    return this.exists(type, no);
  }

  /** Dùng số người dùng nhập (kiểm tra trùng) hoặc tự sinh số tiếp theo. */
  async resolveNo(type: VoucherType, input?: string): Promise<string> {
    const manual = input?.trim();
    if (!manual) return this.nextNo(type);
    if (manual.length > 50) throw new BadRequestException('Số chứng từ quá dài');
    if (await this.exists(type, manual)) throw this.duplicate(manual);
    return manual;
  }

  duplicate(no: string) {
    return new ConflictException({ statusCode: 409, code: VOUCHER_NO_DUPLICATE, message: `Số chứng từ ${no} đã tồn tại` });
  }

  /** Bắt lỗi unique của DB (race condition) và đổi thành 409 có error code. */
  rethrowUnique(e: unknown, no: string): never {
    if (typeof e === 'object' && e && (e as { code?: string }).code === 'P2002') throw this.duplicate(no);
    throw e;
  }

  private where(prefix: string) {
    return { voucherNo: { startsWith: prefix } };
  }

  private async listNos(type: VoucherType, prefix: string): Promise<string[]> {
    const args = { where: this.where(prefix), select: { voucherNo: true } };
    const rows = await this.delegate(type).findMany(args);
    return rows.map((r) => r.voucherNo);
  }

  private async exists(type: VoucherType, no: string): Promise<boolean> {
    return (await this.delegate(type).count({ where: { voucherNo: no } })) > 0;
  }

  private delegate(type: VoucherType) {
    const p = this.prisma;
    const map = {
      IMPORT: p.importOrder,
      EXPORT: p.stockExport,
      RETURN: p.purchaseReturn,
      STOCKTAKE: p.stocktakeSession,
      PROCESSING: p.processingOrder,
    };
    return map[type] as unknown as {
      findMany(a: unknown): Promise<{ voucherNo: string }[]>;
      count(a: unknown): Promise<number>;
    };
  }
}
