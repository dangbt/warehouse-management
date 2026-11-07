import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { collectXmlSources, type UploadedBlob } from './einvoice-files';
import { parseEinvoiceXml } from './einvoice-xml.parser';
import { EinvoiceError, type ParsedEinvoice } from './einvoice.types';
import { SupplierItemMappingService, type MappingHit } from './supplier-item-mapping.service';

export interface EinvoiceLineResult {
  stt: number;
  name: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  vatRate: string;
  vatAmount: number;
  discountAllocated: number;
  /** Mapping đã nhớ (null = chưa có). */
  mapping: MappingHit | null;
}

export interface EinvoiceResult {
  fileName: string;
  ok: boolean;
  error?: { code: string; message: string };
  invoice?: Omit<ParsedEinvoice, 'lines'> & { lines: EinvoiceLineResult[] };
  /** NCC khớp theo MST; null ⇒ đề xuất tạo mới từ thông tin người bán. */
  supplier?: { id: string; name: string } | null;
  /** Hoá đơn (MST + ký hiệu + số) đã được nhập ở phiếu này. */
  duplicateOf?: string | null;
}

const digits = (s: string) => s.replace(/\D/g, '');

@Injectable()
export class EinvoiceService {
  constructor(
    private prisma: PrismaService,
    private mappings: SupplierItemMappingService,
  ) {}

  /** Đọc các file upload; lỗi từng file được báo riêng (không làm hỏng cả lô). Lỗi cấp lô (không file, zip hỏng…) ném ra. */
  async parseUploads(files: UploadedBlob[]): Promise<EinvoiceResult[]> {
    const sources = await collectXmlSources(files);
    const results: EinvoiceResult[] = [];
    const seen = new Set<string>();
    for (const src of sources) {
      try {
        const inv = parseEinvoiceXml(src.buffer);
        const key = `${digits(inv.seller.taxCode)}|${inv.symbol}|${inv.invoiceNo}`;
        const inBatchDup = seen.has(key);
        seen.add(key);
        const r = await this.enrich(src.fileName, inv);
        if (inBatchDup) r.duplicateOf = 'file khác trong lần tải này';
        results.push(r);
      } catch (e) {
        if (!(e instanceof EinvoiceError)) throw e;
        const body = e.getResponse() as { code: string; message: string };
        results.push({ fileName: src.fileName, ok: false, error: { code: body.code, message: body.message } });
      }
    }
    return results;
  }

  private async enrich(fileName: string, inv: ParsedEinvoice): Promise<EinvoiceResult> {
    const supplier = await this.findSupplierByTaxCode(inv.seller.taxCode);
    const map = supplier ? await this.mappings.lookup(supplier.id, inv.lines) : new Map<string, MappingHit>();
    const duplicateOf = supplier ? await this.findDuplicate(supplier.id, inv) : null;
    return {
      fileName,
      ok: true,
      supplier: supplier ? { id: supplier.id, name: supplier.name } : null,
      duplicateOf,
      invoice: {
        ...inv,
        lines: inv.lines.map((l) => ({ ...l, mapping: map.get(SupplierItemMappingService.keyOf(l.name, l.unit)) ?? null })),
      },
    };
  }

  /** So MST theo chữ số (bỏ dấu cách/gạch) để không lệch do định dạng `0123456789-001`. */
  private async findSupplierByTaxCode(taxCode: string) {
    const d = digits(taxCode);
    const cands = await this.prisma.supplier.findMany({
      where: { taxCode: { contains: d.slice(0, 10) } },
      select: { id: true, name: true, taxCode: true },
    });
    return cands.find((s) => s.taxCode && digits(s.taxCode) === d) ?? null;
  }

  private async findDuplicate(supplierId: string, inv: ParsedEinvoice): Promise<string | null> {
    const dup = await this.prisma.importOrder.findFirst({
      where: { supplierId, invoiceNo: inv.invoiceNo, invoiceSymbol: inv.symbol, status: { not: 'REJECTED' } },
      select: { code: true },
    });
    return dup?.code ?? null;
  }
}
