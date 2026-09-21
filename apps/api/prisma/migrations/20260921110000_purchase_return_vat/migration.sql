-- AlterTable
ALTER TABLE "purchase_returns" ADD COLUMN     "import_order_id" TEXT,
ADD COLUMN     "subtotal" DECIMAL(14,2) NOT NULL DEFAULT 0,
ADD COLUMN     "vat_amount" DECIMAL(14,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "purchase_return_items" ADD COLUMN     "vat_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
ADD COLUMN     "vat_rate" TEXT;

-- AddForeignKey
ALTER TABLE "purchase_returns" ADD CONSTRAINT "purchase_returns_import_order_id_fkey" FOREIGN KEY ("import_order_id") REFERENCES "import_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill: phiếu trả cũ (chưa gắn thuế) có tiền hàng = tổng tiền, tiền thuế = 0.
-- Giữ nguyên nghĩa dữ liệu cũ (total_amount không đổi).
UPDATE "purchase_returns" SET "subtotal" = "total_amount" WHERE "subtotal" = 0;
