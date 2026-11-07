import { Prisma } from '@prisma/client';

/** Thay `currentStock` của từng mã hàng bằng tồn tại 1 kho (0 nếu kho chưa có dòng tồn). Dùng cho báo cáo/danh sách lọc theo kho. */
export async function withWarehouseStock<T extends { id: string; currentStock: Prisma.Decimal }>(
  db: Pick<Prisma.TransactionClient, 'ingredientStock'>,
  items: T[],
  warehouseId: string,
): Promise<T[]> {
  if (items.length === 0) return items;
  const rows = await db.ingredientStock.findMany({
    where: { warehouseId, ingredientId: { in: items.map((i) => i.id) } },
    select: { ingredientId: true, qty: true },
  });
  const qty = new Map(rows.map((r) => [r.ingredientId, r.qty]));
  return items.map((i) => ({ ...i, currentStock: qty.get(i.id) ?? new Prisma.Decimal(0) }));
}
