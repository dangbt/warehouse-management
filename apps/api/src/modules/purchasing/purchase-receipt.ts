import { BadRequestException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { computePoStatus } from './purchase-logic';

const num = (v: unknown) => Number(v ?? 0);

/** Kiểm tra PO hợp lệ để lập phiếu nhập (đúng NCC, chưa huỷ/nhận đủ). */
export async function assertPoReceivable(
  db: Prisma.TransactionClient | { purchaseOrder: Prisma.TransactionClient['purchaseOrder'] },
  poId: string,
  supplierId: string,
) {
  const po = await db.purchaseOrder.findUnique({ where: { id: poId } });
  if (!po) throw new BadRequestException('Không tìm thấy đơn mua hàng');
  if (po.status === 'CANCELLED' || po.status === 'RECEIVED') throw new BadRequestException('Đơn mua hàng đã huỷ hoặc đã nhận đủ');
  if (po.supplierId !== supplierId) throw new BadRequestException('Nhà cung cấp không khớp với đơn mua hàng');
}

/**
 * Khi duyệt phiếu nhập liên kết PO: cộng SL đã nhận theo từng NL rồi cập nhật trạng thái PO.
 * Phiếu bị từ chối/chưa duyệt không được tính ⇒ SL còn lại của PO giữ nguyên.
 */
export async function applyReceiptToPo(tx: Prisma.TransactionClient, poId: string, items: { ingredientId: string; quantity: unknown }[]) {
  const po = await tx.purchaseOrder.findUnique({ where: { id: poId }, include: { items: true } });
  if (!po || po.status === 'CANCELLED') throw new BadRequestException('Đơn mua hàng đã huỷ hoặc không tồn tại');
  const lines = po.items.map((l) => ({
    id: l.id,
    ingredientId: l.ingredientId,
    quantity: num(l.quantity),
    receivedQty: num(l.receivedQty),
  }));
  for (const it of items) {
    let left = num(it.quantity);
    for (const l of lines.filter((x) => x.ingredientId === it.ingredientId)) {
      if (left <= 0) break;
      const take = Math.min(left, Math.max(0, l.quantity - l.receivedQty));
      l.receivedQty += take;
      left -= take;
    }
    // Nhận vượt SL đặt: dồn phần dư vào dòng đầu của NL để vẫn ghi nhận.
    const first = lines.find((x) => x.ingredientId === it.ingredientId);
    if (left > 0 && first) first.receivedQty += left;
  }
  for (const l of lines) {
    await tx.purchaseOrderItem.update({ where: { id: l.id }, data: { receivedQty: l.receivedQty } });
  }
  await tx.purchaseOrder.update({ where: { id: poId }, data: { status: computePoStatus(lines) } });
}
