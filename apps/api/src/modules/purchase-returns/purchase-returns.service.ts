import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { VAT_RATES, VatRate, computeLineVat } from '../tax/vat';

export interface PurchaseReturnItemInput {
  ingredient_id: string;
  quantity: number;
  unit_price: number;
  // Thuế suất VAT của dòng. Khi trả theo phiếu nhập, bỏ trống ⇒ lấy theo dòng phiếu nhập.
  vat_rate?: string;
}

export interface CreatePurchaseReturnInput {
  supplier_id: string;
  reason: string;
  note?: string;
  // Phiếu nhập gốc (tuỳ chọn). Có ⇒ ràng buộc NCC/COMPLETED + giới hạn số lượng trả.
  import_order_id?: string;
  items: PurchaseReturnItemInput[];
}

/**
 * Số lượng còn được trả của một nguyên liệu theo một phiếu nhập:
 * = số đã nhập − số đã trả trước đó (theo cùng phiếu nhập này).
 * Không âm (nếu đã trả vượt vì lý do dữ liệu, trả về 0).
 *
 * Hàm thuần để dễ kiểm thử; đầu vào là các số đã quy về đơn vị tồn.
 */
export function remainingReturnableQty(importedQty: number, alreadyReturnedQty: number): number {
  return Math.max(0, importedQty - alreadyReturnedQty);
}

@Injectable()
export class PurchaseReturnsService {
  constructor(private prisma: PrismaService) {}

  async findAll(q: { page?: string; limit?: string; supplierId?: string }) {
    const page = +(q.page || 1),
      limit = +(q.limit || 20);
    const where: { supplierId?: string } = q.supplierId ? { supplierId: q.supplierId } : {};
    const [data, total] = await Promise.all([
      this.prisma.purchaseReturn.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { supplier: true, createdBy: { select: { id: true, fullName: true } }, items: { include: { ingredient: true } } },
      }),
      this.prisma.purchaseReturn.count({ where }),
    ]);
    return { data, meta: { page, limit, total } };
  }

  async create(userId: string, body: CreatePurchaseReturnInput) {
    if (!body.supplier_id || !body.items?.length || !body.reason) {
      throw new BadRequestException('Thiếu thông tin bắt buộc');
    }
    for (const item of body.items) {
      if (!item.ingredient_id || item.quantity <= 0 || item.unit_price < 0) {
        throw new BadRequestException('Dữ liệu item không hợp lệ');
      }
      if (item.vat_rate != null && !(VAT_RATES as readonly string[]).includes(item.vat_rate)) {
        throw new BadRequestException('Thuế suất VAT không hợp lệ');
      }
    }

    // Thuế suất mặc định theo nguyên liệu, lấy từ dòng cùng nguyên liệu của phiếu nhập gốc.
    const defaultVatByIngredient: Map<string, VatRate | null> = new Map();

    if (body.import_order_id) {
      const importOrder = await this.prisma.importOrder.findUnique({
        where: { id: body.import_order_id },
        include: { items: true },
      });
      if (!importOrder) throw new BadRequestException('Phiếu nhập không tồn tại');
      if (importOrder.status !== 'COMPLETED') throw new BadRequestException('Phiếu nhập gốc phải ở trạng thái đã duyệt');
      if (importOrder.supplierId !== body.supplier_id) throw new BadRequestException('Phiếu nhập gốc không cùng nhà cung cấp');

      // Tổng số đã nhập theo nguyên liệu (đơn vị tồn) + thuế suất mặc định.
      const importedByIngredient = new Map<string, number>();
      for (const it of importOrder.items) {
        importedByIngredient.set(it.ingredientId, (importedByIngredient.get(it.ingredientId) ?? 0) + Number(it.quantity));
        // Dòng đầu tiên gặp cho mỗi nguyên liệu quyết định thuế suất mặc định.
        if (!defaultVatByIngredient.has(it.ingredientId)) {
          defaultVatByIngredient.set(it.ingredientId, (it.vatRate as VatRate | null) ?? null);
        }
      }

      // Số đã trả trước đó theo cùng phiếu nhập này (cộng dồn theo nguyên liệu).
      const priorReturns = await this.prisma.purchaseReturnItem.findMany({
        where: { purchaseReturn: { importOrderId: body.import_order_id } },
        select: { ingredientId: true, quantity: true },
      });
      const returnedByIngredient = new Map<string, number>();
      for (const r of priorReturns) {
        returnedByIngredient.set(r.ingredientId, (returnedByIngredient.get(r.ingredientId) ?? 0) + Number(r.quantity));
      }

      // Cộng dồn số lượng trả trong chính phiếu này để chặn vượt tổng.
      const requestedByIngredient = new Map<string, number>();
      for (const item of body.items) {
        requestedByIngredient.set(item.ingredient_id, (requestedByIngredient.get(item.ingredient_id) ?? 0) + item.quantity);
      }

      for (const [ingredientId, requested] of requestedByIngredient) {
        const imported = importedByIngredient.get(ingredientId);
        if (imported == null) throw new BadRequestException('Nguyên liệu không thuộc phiếu nhập gốc');
        const remaining = remainingReturnableQty(imported, returnedByIngredient.get(ingredientId) ?? 0);
        if (requested > remaining) {
          throw new BadRequestException(`Số lượng trả vượt số còn được trả theo phiếu nhập (còn ${remaining})`);
        }
      }
    }

    const code = `PTH-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String(Date.now()).slice(-4)}`;

    // Tính từng dòng: thành tiền + tiền thuế (làm tròn về đồng theo từng dòng).
    const lines = body.items.map((i) => {
      const totalPrice = i.quantity * i.unit_price;
      // Ưu tiên vat_rate gửi lên; nếu bỏ trống và có phiếu nhập gốc ⇒ lấy mặc định theo nguyên liệu.
      const vatRate: VatRate | null = i.vat_rate != null ? (i.vat_rate as VatRate) : (defaultVatByIngredient.get(i.ingredient_id) ?? null);
      return {
        ingredientId: i.ingredient_id,
        quantity: i.quantity,
        unitPrice: i.unit_price,
        totalPrice,
        vatRate,
        vatAmount: computeLineVat(totalPrice, vatRate),
      };
    });

    const subtotal = lines.reduce((s, l) => s + l.totalPrice, 0);
    const vatAmount = lines.reduce((s, l) => s + l.vatAmount, 0);
    const totalAmount = subtotal + vatAmount;

    return await this.prisma.$transaction(async (tx) => {
      const purchaseReturn = await tx.purchaseReturn.create({
        data: {
          code,
          supplierId: body.supplier_id,
          importOrderId: body.import_order_id ?? null,
          subtotal,
          vatAmount,
          totalAmount,
          reason: body.reason,
          note: body.note,
          createdById: userId,
          items: {
            create: lines.map((l) => ({
              ingredientId: l.ingredientId,
              quantity: l.quantity,
              unitPrice: l.unitPrice,
              totalPrice: l.totalPrice,
              vatRate: l.vatRate,
              vatAmount: l.vatAmount,
            })),
          },
        },
        include: { items: true },
      });

      for (const line of lines) {
        await tx.ingredient.update({
          where: { id: line.ingredientId },
          data: { currentStock: { decrement: line.quantity } },
        });
        await tx.stockTransaction.create({
          data: {
            ingredientId: line.ingredientId,
            type: 'RETURN',
            quantity: -line.quantity,
            unitPrice: line.unitPrice,
            totalPrice: line.totalPrice,
            referenceId: purchaseReturn.id,
            createdById: userId,
            note: `Trả hàng NCC: ${code}`,
          },
        });
      }

      // Công nợ NCC giảm theo tổng thanh toán (đã gồm VAT được hoàn/khấu trừ lại).
      await tx.supplier.update({
        where: { id: body.supplier_id },
        data: { totalDebt: { decrement: totalAmount } },
      });

      return purchaseReturn;
    });
  }
}
