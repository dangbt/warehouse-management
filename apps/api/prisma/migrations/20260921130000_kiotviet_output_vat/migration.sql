-- AlterTable
ALTER TABLE "menu_items" ADD COLUMN     "vat_rate" TEXT;

-- AlterTable
ALTER TABLE "kiotviet_orders" ADD COLUMN     "amount_before_tax" DECIMAL(14,2) NOT NULL DEFAULT 0,
ADD COLUMN     "vat_amount" DECIMAL(14,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "kiotviet_order_items" ADD COLUMN     "amount_before_tax" DECIMAL(14,2) NOT NULL DEFAULT 0,
ADD COLUMN     "vat_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
ADD COLUMN     "vat_rate" TEXT;

