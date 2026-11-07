import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

type Db = Pick<Prisma.TransactionClient, 'warehouse' | 'ingredientStock' | 'ingredient'>;

/**
 * Tồn theo kho: ingredient_stock(ingredient, warehouse, qty). Ingredient.currentStock luôn = tổng mọi kho,
 * nên mọi nơi ghi tồn PHẢI đi qua `adjust` để hai số không lệch nhau.
 */
@Injectable()
export class WarehouseStockService {
  constructor(private prisma: PrismaService) {}

  /** Kho áp dụng cho request: id client gửi (phải tồn tại + đang hoạt động), không gửi ⇒ kho mặc định. */
  async resolveId(warehouseId?: string | null, db: Db = this.prisma): Promise<string> {
    if (warehouseId) {
      const w = await db.warehouse.findUnique({ where: { id: warehouseId }, select: { id: true, active: true } });
      if (!w) throw new BadRequestException('Kho không tồn tại');
      if (!w.active) throw new BadRequestException('Kho đã ngừng hoạt động');
      return w.id;
    }
    const def = await db.warehouse.findFirst({ where: { isDefault: true }, select: { id: true } });
    if (!def) throw new BadRequestException('Chưa có kho mặc định');
    return def.id;
  }

  /** Tồn của 1 mã hàng tại 1 kho (0 nếu chưa có dòng). */
  async getQty(db: Db, ingredientId: string, warehouseId: string): Promise<number> {
    const row = await db.ingredientStock.findUnique({
      where: { ingredientId_warehouseId: { ingredientId, warehouseId } },
      select: { qty: true },
    });
    return row ? Number(row.qty) : 0;
  }

  /** Cộng/trừ tồn tại kho (delta âm = xuất) và cập nhật tổng Ingredient.currentStock. */
  async adjust(db: Db, ingredientId: string, warehouseId: string, delta: number | Prisma.Decimal): Promise<void> {
    await db.ingredientStock.upsert({
      where: { ingredientId_warehouseId: { ingredientId, warehouseId } },
      create: { ingredientId, warehouseId, qty: delta },
      update: { qty: { increment: delta } },
    });
    await db.ingredient.update({ where: { id: ingredientId }, data: { currentStock: { increment: delta } } });
  }

  /** Đặt tồn tại kho về giá trị tuyệt đối (kiểm kê). */
  async setQty(db: Db, ingredientId: string, warehouseId: string, qty: number | Prisma.Decimal): Promise<void> {
    const current = await this.getQty(db, ingredientId, warehouseId);
    await this.adjust(db, ingredientId, warehouseId, Number(qty) - current);
  }
}
