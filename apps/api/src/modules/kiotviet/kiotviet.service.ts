import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BatchDeductionService } from '../common/batch-deduction.service';
import { splitLineTax, allocateDiscount, VAT_RATES, type VatRate } from '../tax/vat';
import { parsePeriod } from '../tax/period';

interface KiotVietOrderInput {
  id: string;
  code: string;
  customerName?: string;
  totalAmount: number;
  orderDate: string;
  items: { productName: string; quantity: number; price: number }[];
}

interface KiotVietInvoice {
  id: number;
  code: string;
  customerName?: string;
  total: number;
  purchaseDate: string;
  invoiceDetails?: KiotVietInvoiceDetail[];
}

interface KiotVietInvoiceDetail {
  productName: string;
  quantity: number;
  price: number;
}

@Injectable()
export class KiotVietService {
  constructor(
    private prisma: PrismaService,
    private batchDeduction: BatchDeductionService,
  ) {}

  private normalize(s: string) {
    return s
      .toLowerCase()
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D');
  }

  /** Sync from KiotViet API directly */
  async syncFromApi(
    config: { clientId: string; clientSecret: string; retailer: string; fromDate?: string; toDate?: string },
    userId: string,
  ) {
    // 1. Get access token
    const tokenRes = await fetch('https://id.kiotviet.vn/connect/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `scopes=PublicApi.Access&grant_type=client_credentials&client_id=${config.clientId}&client_secret=${config.clientSecret}`,
    });
    if (!tokenRes.ok) throw new BadRequestException('Không thể xác thực KiotViet: ' + (await tokenRes.text()));
    const { access_token } = (await tokenRes.json()) as { access_token: string };

    // 2. Fetch invoices
    const params = new URLSearchParams({ pageSize: '100', orderBy: 'createdDate', orderDirection: 'DESC' });
    if (config.fromDate) params.set('fromPurchaseDate', config.fromDate);
    if (config.toDate) params.set('toPurchaseDate', config.toDate);

    const invoiceRes = await fetch(`https://public.kiotapi.com/invoices?${params}`, {
      headers: { Retailer: config.retailer, Authorization: `Bearer ${access_token}` },
    });
    if (!invoiceRes.ok) throw new BadRequestException('Lỗi lấy hóa đơn KiotViet: ' + (await invoiceRes.text()));
    const { data: invoices } = (await invoiceRes.json()) as { data: KiotVietInvoice[] };

    // 3. Transform to our format and sync
    const orders: KiotVietOrderInput[] = invoices.map((inv) => ({
      id: String(inv.id),
      code: inv.code,
      customerName: inv.customerName,
      totalAmount: inv.total,
      orderDate: inv.purchaseDate,
      items: (inv.invoiceDetails || []).map((d) => ({
        productName: d.productName,
        quantity: d.quantity,
        price: d.price,
      })),
    }));

    return this.syncOrders(orders, userId);
  }
  /** Đồng bộ danh sách sản phẩm (thực đơn) từ KiotViet → menu_items (upsert theo mã KiotViet) */
  async syncProducts(products: { id: string; name: string; price?: number; category?: string }[]) {
    const results = { created: 0, updated: 0 };
    for (const p of products) {
      const existing = await this.prisma.menuItem.findUnique({ where: { kiotvietProductId: String(p.id) } });
      if (existing) {
        await this.prisma.menuItem.update({
          where: { id: existing.id },
          data: { name: p.name, price: p.price ?? existing.price, category: p.category ?? existing.category, isActive: true },
        });
        results.updated++;
      } else {
        await this.prisma.menuItem.create({
          data: {
            name: p.name,
            price: p.price ?? 0,
            category: p.category ?? 'KiotViet',
            kiotvietProductId: String(p.id),
            // Món mới = chưa cấu hình cách trừ tồn (inventoryMode = null)
          },
        });
        results.created++;
      }
    }
    return results;
  }

  async syncOrders(orders: KiotVietOrderInput[], userId: string) {
    const results = { synced: 0, skipped: 0, deducted: 0, unconfigured: [] as string[], errors: [] as string[] };

    // Cấu hình thuế đầu ra dùng chung cho cả lần đồng bộ.
    const setting = await this.getTaxDefaults();

    for (const order of orders) {
      const exists = await this.prisma.kiotVietOrder.findUnique({ where: { kiotVietId: order.id } });
      if (exists) {
        results.skipped++;
        continue;
      }

      // Match items to menu items by name
      const menuItems = await this.prisma.menuItem.findMany();
      const matchedItems = order.items.map((item) => {
        const norm = this.normalize(item.productName);
        const matched =
          menuItems.find((m) => this.normalize(m.name) === norm) ||
          menuItems.find((m) => this.normalize(m.name).includes(norm) || norm.includes(this.normalize(m.name)));
        return { item, matched };
      });

      // Snapshot thuế đầu ra: tách doanh thu chưa thuế + VAT theo thuế suất của từng món.
      const snapshot = this.computeOutputVatSnapshot(
        matchedItems.map(({ item, matched }) => ({
          quantity: item.quantity,
          price: item.price,
          rate: this.resolveRate(matched?.vatRate ?? null, setting.defaultOutputVatRate),
        })),
        Number(order.totalAmount),
        setting.pricesIncludeVat,
      );

      const itemsData = matchedItems.map(({ item, matched }, i) => ({
        productName: item.productName,
        menuItemId: matched?.id || null,
        quantity: item.quantity,
        price: item.price,
        vatRate: snapshot.items[i].rate,
        amountBeforeTax: snapshot.items[i].amountBeforeTax,
        vatAmount: snapshot.items[i].vatAmount,
      }));

      const created = await this.prisma.kiotVietOrder.create({
        data: {
          kiotVietId: order.id,
          code: order.code,
          customerName: order.customerName,
          totalAmount: order.totalAmount,
          amountBeforeTax: snapshot.amountBeforeTax,
          vatAmount: snapshot.vatAmount,
          orderDate: new Date(order.orderDate),
          items: { create: itemsData },
        },
      });
      results.synced++;

      // Tự động trừ kho ngay sau khi sync (best-effort: 1 order lỗi không chặn các order khác)
      try {
        const r = await this.deductOrder(created.id, userId);
        if (r.deductions > 0) results.deducted++;
        for (const u of r.unconfigured) if (!results.unconfigured.includes(u)) results.unconfigured.push(u);
      } catch (e) {
        results.errors.push(`${order.code}: ${(e as Error).message}`);
      }
    }

    return results;
  }

  async deductOrder(orderId: string, userId: string) {
    const order = await this.prisma.kiotVietOrder.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            menuItem: {
              include: { recipe: { include: { ingredients: { include: { ingredient: { select: { id: true, trackStock: true } } } } } } },
            },
          },
        },
      },
    });

    if (!order) throw new BadRequestException('Đơn hàng không tồn tại');
    if (order.deducted) throw new BadRequestException('Đơn hàng đã được trừ kho');

    // Gom NL cần trừ theo cách cấu hình của từng món (mode)
    const deductions: { ingredientId: string; quantity: number }[] = [];
    const unconfigured: string[] = []; // tên món chưa cấu hình cách trừ tồn
    const add = (ingredientId: string, quantity: number) => {
      const e = deductions.find((d) => d.ingredientId === ingredientId);
      if (e) e.quantity += quantity;
      else deductions.push({ ingredientId, quantity });
    };

    for (const item of order.items) {
      const mi = item.menuItem;
      if (!mi) {
        unconfigured.push(item.productName);
        continue;
      }
      const mode = mi.inventoryMode;
      if (mode === 'NONE') continue; // không quản tồn → bỏ qua êm
      if ((mode === 'RECIPE' || mode == null) && mi.recipe) {
        // Món chế biến: trừ NL theo công thức
        for (const ri of mi.recipe.ingredients) {
          if (ri.ingredient && !ri.ingredient.trackStock) continue;
          add(ri.ingredientId, (Number(ri.quantity) * item.quantity) / mi.recipe.servingSize);
        }
      } else if (mode === 'DIRECT' && mi.directIngredientId) {
        // Hàng bán thẳng: 1 món = 1 đơn vị tồn của NL gắn trực tiếp
        const directIng = await this.prisma.ingredient.findUnique({ where: { id: mi.directIngredientId }, select: { trackStock: true } });
        if (directIng?.trackStock !== false) add(mi.directIngredientId, item.quantity);
      } else {
        unconfigured.push(mi.name); // mode set nhưng thiếu cấu hình, hoặc chưa gán công thức
      }
    }

    if (deductions.length > 0) {
      await this.prisma.$transaction(async (tx) => {
        for (const d of deductions) {
          const batchResults = await this.batchDeduction.deductFromBatches(tx, d.ingredientId, d.quantity);
          await tx.ingredient.update({ where: { id: d.ingredientId }, data: { currentStock: { decrement: d.quantity } } });
          for (const b of batchResults) {
            await tx.stockTransaction.create({
              data: {
                ingredientId: d.ingredientId,
                type: 'ORDER_DEDUCT',
                quantity: -b.qty,
                referenceId: b.batchId,
                note: `Trừ kho từ đơn KiotViet ${order.code}`,
                createdById: userId,
              },
            });
          }
        }
        await tx.kiotVietOrder.update({ where: { id: orderId }, data: { deducted: true } });
      });
    } else if (unconfigured.length === 0) {
      // Toàn món "không quản tồn" → đánh dấu đã xử lý
      await this.prisma.kiotVietOrder.update({ where: { id: orderId }, data: { deducted: true } });
    }
    // else: có món chưa cấu hình & chưa trừ gì → để deducted=false, retry sau khi cấu hình

    return { message: `Đơn ${order.code}: trừ ${deductions.length} NL`, deductions: deductions.length, unconfigured };
  }

  /** Lấy cấu hình thuế đầu ra (thuế suất mặc định + giá có gồm VAT hay chưa). */
  private async getTaxDefaults(): Promise<{ defaultOutputVatRate: VatRate; pricesIncludeVat: boolean }> {
    const setting = await this.prisma.taxSetting.findUnique({ where: { id: 'default' } });
    const raw = setting?.defaultOutputVatRate ?? '8';
    const defaultOutputVatRate = (VAT_RATES as readonly string[]).includes(raw) ? (raw as VatRate) : '8';
    return { defaultOutputVatRate, pricesIncludeVat: setting?.pricesIncludeVat ?? true };
  }

  /** Thuế suất áp dụng cho dòng: dùng của món nếu hợp lệ, không thì mặc định cấu hình. */
  private resolveRate(menuRate: string | null, fallback: VatRate): VatRate {
    if (menuRate != null && (VAT_RATES as readonly string[]).includes(menuRate)) return menuRate as VatRate;
    return fallback;
  }

  /**
   * Tính snapshot thuế đầu ra cho một đơn hàng.
   *
   * - `lineGross = price × quantity` mỗi dòng; phân bổ chênh lệch với `totalAmount`
   *   (chiết khấu cấp hoá đơn / làm tròn) theo tỷ lệ `lineGross`, dòng cuối nhận phần dư.
   * - Tách mỗi dòng thành tiền chưa thuế + VAT theo thuế suất dòng và `pricesIncludeVat`.
   * - Tổng đơn = Σ các dòng (tiền thuế làm tròn từng dòng rồi mới cộng).
   */
  private computeOutputVatSnapshot(
    lines: { quantity: number; price: number; rate: VatRate }[],
    totalAmount: number,
    pricesIncludeVat: boolean,
  ): {
    amountBeforeTax: number;
    vatAmount: number;
    items: { rate: VatRate; amountBeforeTax: number; vatAmount: number }[];
  } {
    const grosses = lines.map((l) => l.price * l.quantity);
    const allocated = allocateDiscount(grosses, totalAmount);

    const items = lines.map((l, i) => {
      const split = splitLineTax({ lineGross: allocated[i], rate: l.rate, pricesIncludeVat });
      return { rate: l.rate, amountBeforeTax: split.amountBeforeTax, vatAmount: split.vatAmount };
    });

    return {
      amountBeforeTax: items.reduce((s, it) => s + it.amountBeforeTax, 0),
      vatAmount: items.reduce((s, it) => s + it.vatAmount, 0),
      items,
    };
  }

  /**
   * Tính lại snapshot thuế đầu ra cho các đơn KiotViet trong kỳ.
   *
   * Dùng khi đổi thuế suất món hoặc cấu hình thuế. Chỉ ảnh hưởng các đơn có
   * `orderDate` (cột timestamp) trong kỳ. Không tự chạy khi migrate/sync.
   */
  async recomputeOutputVat(periodValue: string | undefined) {
    const period = parsePeriod(periodValue);
    const setting = await this.getTaxDefaults();

    const orders = await this.prisma.kiotVietOrder.findMany({
      where: { orderDate: { gte: period.from, lte: period.to } },
      include: { items: { include: { menuItem: { select: { vatRate: true } } } } },
    });

    let updated = 0;
    for (const order of orders) {
      const snapshot = this.computeOutputVatSnapshot(
        order.items.map((it) => ({
          quantity: it.quantity,
          price: Number(it.price),
          rate: this.resolveRate(it.menuItem?.vatRate ?? null, setting.defaultOutputVatRate),
        })),
        Number(order.totalAmount),
        setting.pricesIncludeVat,
      );

      await this.prisma.$transaction([
        this.prisma.kiotVietOrder.update({
          where: { id: order.id },
          data: { amountBeforeTax: snapshot.amountBeforeTax, vatAmount: snapshot.vatAmount },
        }),
        ...order.items.map((it, i) =>
          this.prisma.kiotVietOrderItem.update({
            where: { id: it.id },
            data: {
              vatRate: snapshot.items[i].rate,
              amountBeforeTax: snapshot.items[i].amountBeforeTax,
              vatAmount: snapshot.items[i].vatAmount,
            },
          }),
        ),
      ]);
      updated++;
    }

    return { period: period.label, updated };
  }

  async getOrders(query: { page?: string; limit?: string; deducted?: string }) {
    const page = Math.max(1, +(query.page || 1));
    const limit = Math.min(100, Math.max(1, +(query.limit || 20)));
    const where = query.deducted !== undefined ? { deducted: query.deducted === 'true' } : {};

    const [data, total] = await Promise.all([
      this.prisma.kiotVietOrder.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { orderDate: 'desc' },
        include: { items: { include: { menuItem: true } } },
      }),
      this.prisma.kiotVietOrder.count({ where }),
    ]);

    return { data, meta: { page, limit, total } };
  }
}
