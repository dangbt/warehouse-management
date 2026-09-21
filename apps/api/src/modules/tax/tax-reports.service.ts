import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { parsePeriod } from './period';
import { roundVnd, VAT_RATES } from './vat';

/** Một dòng trong bảng kê (một hoá đơn mua vào hoặc một phiếu trả hàng). */
export interface InputInvoiceRow {
  stt: number;
  invoiceSymbol: string | null;
  invoiceNo: string | null;
  invoiceDate: string | null;
  supplierName: string;
  supplierTaxCode: string | null;
  subtotal: number;
  vatAmount: number;
  importOrderCode: string;
  note?: string;
}

/** Nhóm các dòng theo thuế suất, kèm tổng nhóm. */
export interface InputInvoiceGroup {
  vatRate: string;
  rows: InputInvoiceRow[];
  subtotal: number;
  vatAmount: number;
}

export interface InputInvoiceReport {
  period: { value: string; label: string; from: string; to: string };
  settings: { companyName: string | null; taxCode: string | null };
  groups: InputInvoiceGroup[];
  total: { subtotal: number; vatAmount: number };
}

/** Thứ tự hiển thị nhóm thuế suất trong báo cáo. */
const VAT_RATE_ORDER = new Map<string, number>(VAT_RATES.map((r, i) => [r, i]));

@Injectable()
export class TaxReportsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Bảng kê hoá đơn, chứng từ hàng hoá dịch vụ mua vào trong kỳ.
   *
   * Nguồn dữ liệu:
   * - `ImportOrder` status `COMPLETED`, `hasInvoice = true`, `invoiceDate` trong kỳ ⇒ dòng dương.
   * - `PurchaseReturn` có `importOrderId` trỏ tới phiếu nhập có hoá đơn (`hasInvoice = true`),
   *   `createdAt` trong kỳ ⇒ dòng âm (giảm trừ), ghi chú "Trả hàng {code}".
   *
   * Gộp theo thuế suất; mỗi hoá đơn/phiếu trả tách thành nhiều dòng nếu có nhiều thuế suất.
   * Tiền thuế làm tròn về đồng theo từng dòng, rồi mới cộng tổng.
   */
  async inputInvoiceRegister(periodValue: string | undefined): Promise<InputInvoiceReport> {
    const period = parsePeriod(periodValue);

    const [setting, orders, returns] = await Promise.all([
      this.prisma.taxSetting.findUnique({ where: { id: 'default' } }),
      this.prisma.importOrder.findMany({
        where: {
          status: 'COMPLETED',
          hasInvoice: true,
          invoiceDate: { gte: period.from, lte: period.to },
        },
        include: { supplier: true, items: true },
        orderBy: { invoiceDate: 'asc' },
      }),
      this.prisma.purchaseReturn.findMany({
        where: {
          createdAt: { gte: period.from, lte: period.to },
          importOrder: { is: { hasInvoice: true } },
        },
        include: { supplier: true, importOrder: true, items: true },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    // Gom các dòng theo thuế suất.
    const groupMap = new Map<string, InputInvoiceRow[]>();
    const pushRow = (vatRate: string, row: Omit<InputInvoiceRow, 'stt'>) => {
      const list = groupMap.get(vatRate) ?? [];
      list.push({ ...row, stt: 0 });
      groupMap.set(vatRate, list);
    };

    // Hoá đơn mua vào (dòng dương).
    for (const order of orders) {
      const perRate = this.sumItemsByVatRate(order.items);
      for (const [vatRate, agg] of perRate) {
        pushRow(vatRate, {
          invoiceSymbol: order.invoiceSymbol,
          invoiceNo: order.invoiceNo,
          invoiceDate: order.invoiceDate ? order.invoiceDate.toISOString() : null,
          supplierName: order.supplier.name,
          supplierTaxCode: order.supplier.taxCode,
          subtotal: agg.subtotal,
          vatAmount: agg.vatAmount,
          importOrderCode: order.code,
        });
      }
    }

    // Phiếu trả hàng (dòng âm) — chỉ khi phiếu nhập gốc có hoá đơn.
    for (const ret of returns) {
      const perRate = this.sumItemsByVatRate(ret.items);
      for (const [vatRate, agg] of perRate) {
        pushRow(vatRate, {
          invoiceSymbol: ret.importOrder?.invoiceSymbol ?? null,
          invoiceNo: ret.importOrder?.invoiceNo ?? null,
          invoiceDate: ret.createdAt.toISOString(),
          supplierName: ret.supplier.name,
          supplierTaxCode: ret.supplier.taxCode,
          subtotal: -agg.subtotal,
          vatAmount: -agg.vatAmount,
          importOrderCode: ret.importOrder?.code ?? ret.code,
          note: `Trả hàng ${ret.code}`,
        });
      }
    }

    // Sắp xếp nhóm theo thứ tự thuế suất, đánh STT và tính tổng nhóm.
    const groups: InputInvoiceGroup[] = [...groupMap.entries()]
      .sort((a, b) => (VAT_RATE_ORDER.get(a[0]) ?? 99) - (VAT_RATE_ORDER.get(b[0]) ?? 99))
      .map(([vatRate, rows]) => {
        rows.forEach((r, i) => (r.stt = i + 1));
        const subtotal = rows.reduce((s, r) => s + r.subtotal, 0);
        const vatAmount = rows.reduce((s, r) => s + r.vatAmount, 0);
        return { vatRate, rows, subtotal, vatAmount };
      });

    const total = {
      subtotal: groups.reduce((s, g) => s + g.subtotal, 0),
      vatAmount: groups.reduce((s, g) => s + g.vatAmount, 0),
    };

    return {
      period: { value: periodValue!, label: period.label, from: period.from.toISOString(), to: period.to.toISOString() },
      settings: { companyName: setting?.companyName ?? null, taxCode: setting?.taxCode ?? null },
      groups,
      total,
    };
  }

  /**
   * Cộng dồn tiền hàng (chưa thuế) và tiền thuế theo từng thuế suất.
   * Tiền thuế làm tròn về đồng cho từng dòng chi tiết rồi mới cộng.
   * Dòng không có thuế suất (`vatRate` null) gộp vào mã "KCT" (không chịu thuế).
   */
  private sumItemsByVatRate(
    items: { vatRate: string | null; totalPrice: unknown; vatAmount: unknown }[],
  ): Map<string, { subtotal: number; vatAmount: number }> {
    const map = new Map<string, { subtotal: number; vatAmount: number }>();
    for (const item of items) {
      const rate = item.vatRate ?? 'KCT';
      const entry = map.get(rate) ?? { subtotal: 0, vatAmount: 0 };
      entry.subtotal += Number(item.totalPrice);
      entry.vatAmount += roundVnd(Number(item.vatAmount));
      map.set(rate, entry);
    }
    return map;
  }
}
