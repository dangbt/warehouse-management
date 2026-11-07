import { BadRequestException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { addReceipt, computePoStatus, removeReceipt } from './purchase-logic';

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

async function loadLines(tx: Prisma.TransactionClient, poId: string) {
  const po = await tx.purchaseOrder.findUnique({ where: { id: poId }, include: { items: true } });
  if (!po) throw new BadRequestException('Không tìm thấy đơn mua hàng');
  const lines = po.items.map((l) => ({
    id: l.id,
    ingredientId: l.ingredientId,
    quantity: num(l.quantity),
    receivedQty: num(l.receivedQty),
  }));
  return { po, lines };
}

async function saveLines(tx: Prisma.TransactionClient, poId: string, lines: ReturnType<typeof addReceipt>, cancelled: boolean) {
  for (const l of lines) await tx.purchaseOrderItem.update({ where: { id: l.id }, data: { receivedQty: l.receivedQty } });
  if (!cancelled) await tx.purchaseOrder.update({ where: { id: poId }, data: { status: computePoStatus(lines) } });
}

/** Khi duyệt phiếu nhập liên kết PO: cộng SL đã nhận theo từng NL rồi cập nhật trạng thái PO. */
export async function applyReceiptToPo(tx: Prisma.TransactionClient, poId: string, items: { ingredientId: string; quantity: unknown }[]) {
  const { po, lines } = await loadLines(tx, poId);
  if (po.status === 'CANCELLED') throw new BadRequestException('Đơn mua hàng đã huỷ');
  await saveLines(
    tx,
    poId,
    addReceipt(
      lines,
      items.map((i) => ({ ingredientId: i.ingredientId, quantity: num(i.quantity) })),
    ),
    false,
  );
}

/** Bỏ ghi phiếu nhập (unpost): trả lại SL còn lại của PO, tính lại trạng thái. Gọi trong transaction unpost. */
export async function revertReceiptFromPo(
  tx: Prisma.TransactionClient,
  poId: string,
  items: { ingredientId: string; quantity: unknown }[],
) {
  const { po, lines } = await loadLines(tx, poId);
  await saveLines(
    tx,
    poId,
    removeReceipt(
      lines,
      items.map((i) => ({ ingredientId: i.ingredientId, quantity: num(i.quantity) })),
    ),
    po.status === 'CANCELLED',
  );
}
