-- AlterTable
ALTER TABLE "suppliers" ADD COLUMN     "tax_code" TEXT;

-- AlterTable
ALTER TABLE "import_orders" ADD COLUMN     "has_invoice" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "invoice_date" DATE,
ADD COLUMN     "invoice_no" TEXT,
ADD COLUMN     "invoice_symbol" TEXT,
ADD COLUMN     "subtotal" DECIMAL(14,2) NOT NULL DEFAULT 0,
ADD COLUMN     "vat_amount" DECIMAL(14,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "import_order_items" ADD COLUMN     "vat_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
ADD COLUMN     "vat_rate" TEXT;

-- Backfill: phiếu cũ chưa có VAT ⇒ subtotal = total_amount (vat_amount = 0 ⇒ total_amount không đổi).
UPDATE "import_orders" SET "subtotal" = "total_amount";
