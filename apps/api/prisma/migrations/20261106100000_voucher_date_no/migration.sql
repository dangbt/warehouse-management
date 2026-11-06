-- Ngày chứng từ + Số chứng từ cho 5 loại chứng từ kho. Backfill: voucher_date = created_at, voucher_no = code.
ALTER TABLE "import_orders" ADD COLUMN "voucher_date" TIMESTAMP(3), ADD COLUMN "voucher_no" TEXT;
ALTER TABLE "stocktake_sessions" ADD COLUMN "voucher_date" TIMESTAMP(3), ADD COLUMN "voucher_no" TEXT;
ALTER TABLE "purchase_returns" ADD COLUMN "voucher_date" TIMESTAMP(3), ADD COLUMN "voucher_no" TEXT;
ALTER TABLE "processing_orders" ADD COLUMN "voucher_date" TIMESTAMP(3), ADD COLUMN "voucher_no" TEXT;

UPDATE "import_orders" SET "voucher_date" = "created_at", "voucher_no" = "code";
UPDATE "stocktake_sessions" SET "voucher_date" = "created_at", "voucher_no" = "code";
UPDATE "purchase_returns" SET "voucher_date" = "created_at", "voucher_no" = "code";
UPDATE "processing_orders" SET "voucher_date" = "created_at", "voucher_no" = "code";

ALTER TABLE "import_orders" ALTER COLUMN "voucher_date" SET NOT NULL, ALTER COLUMN "voucher_date" SET DEFAULT CURRENT_TIMESTAMP, ALTER COLUMN "voucher_no" SET NOT NULL;
ALTER TABLE "stocktake_sessions" ALTER COLUMN "voucher_date" SET NOT NULL, ALTER COLUMN "voucher_date" SET DEFAULT CURRENT_TIMESTAMP, ALTER COLUMN "voucher_no" SET NOT NULL;
ALTER TABLE "purchase_returns" ALTER COLUMN "voucher_date" SET NOT NULL, ALTER COLUMN "voucher_date" SET DEFAULT CURRENT_TIMESTAMP, ALTER COLUMN "voucher_no" SET NOT NULL;
ALTER TABLE "processing_orders" ALTER COLUMN "voucher_date" SET NOT NULL, ALTER COLUMN "voucher_date" SET DEFAULT CURRENT_TIMESTAMP, ALTER COLUMN "voucher_no" SET NOT NULL;

CREATE UNIQUE INDEX "import_orders_voucher_no_key" ON "import_orders"("voucher_no");
CREATE UNIQUE INDEX "stocktake_sessions_voucher_no_key" ON "stocktake_sessions"("voucher_no");
CREATE UNIQUE INDEX "purchase_returns_voucher_no_key" ON "purchase_returns"("voucher_no");
CREATE UNIQUE INDEX "processing_orders_voucher_no_key" ON "processing_orders"("voucher_no");

-- Chứng từ xuất kho: mỗi dòng EXPORT cũ thành 1 chứng từ riêng (id dùng chung để truy vết).
CREATE TABLE "stock_exports" (
    "id" TEXT NOT NULL,
    "voucher_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "voucher_no" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "stock_exports_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "stock_exports_voucher_no_key" ON "stock_exports"("voucher_no");

ALTER TABLE "stock_transactions" ADD COLUMN "voucher_date" TIMESTAMP(3), ADD COLUMN "export_id" TEXT;

-- Giao dịch kho kế thừa ngày chứng từ của chứng từ gốc (referenceId = id phiếu nhập/trả hàng, hoặc code chế biến/kiểm kê).
UPDATE "stock_transactions" SET "voucher_date" = "created_at";
UPDATE "stock_transactions" t SET "voucher_date" = o."voucher_date" FROM "import_orders" o WHERE t."type" = 'IMPORT' AND t."reference_id" = o."id";
UPDATE "stock_transactions" t SET "voucher_date" = r."voucher_date" FROM "purchase_returns" r WHERE t."reference_id" = r."id";

INSERT INTO "stock_exports" ("id", "voucher_date", "voucher_no", "created_at")
SELECT "id", "created_at", 'XK-' || "id", "created_at" FROM "stock_transactions" WHERE "type" = 'EXPORT';
UPDATE "stock_transactions" SET "export_id" = "id" WHERE "type" = 'EXPORT';

ALTER TABLE "stock_transactions" ALTER COLUMN "voucher_date" SET NOT NULL, ALTER COLUMN "voucher_date" SET DEFAULT CURRENT_TIMESTAMP;
CREATE INDEX "stock_transactions_ingredient_id_voucher_date_idx" ON "stock_transactions"("ingredient_id", "voucher_date");
ALTER TABLE "stock_transactions" ADD CONSTRAINT "stock_transactions_export_id_fkey" FOREIGN KEY ("export_id") REFERENCES "stock_exports"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "voucher_configs" (
    "type" TEXT NOT NULL,
    "prefix" TEXT NOT NULL,
    "digits" INTEGER NOT NULL DEFAULT 5,
    CONSTRAINT "voucher_configs_pkey" PRIMARY KEY ("type")
);
INSERT INTO "voucher_configs" ("type", "prefix", "digits") VALUES
 ('IMPORT','NK',5),('EXPORT','XK',5),('RETURN','TH',5),('STOCKTAKE','KK',5),('PROCESSING','CB',5);

UPDATE "stock_transactions" t SET "voucher_date" = s."voucher_date" FROM "stocktake_sessions" s WHERE t."reference_id" = s."id";
UPDATE "stock_transactions" t SET "voucher_date" = p."voucher_date" FROM "processing_orders" p WHERE t."reference_id" = p."code";
