-- Nhiều kho (WMS-10). An toàn trên dữ liệu có sẵn: tạo kho chính -> backfill -> mới set NOT NULL.
CREATE TABLE "warehouses" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "address" TEXT,
  "is_default" BOOLEAN NOT NULL DEFAULT false,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "warehouses_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "warehouses_code_key" ON "warehouses"("code");
-- Tối đa 1 kho mặc định
CREATE UNIQUE INDEX "warehouses_single_default" ON "warehouses"("is_default") WHERE "is_default";

INSERT INTO "warehouses" ("id", "code", "name", "is_default", "active")
VALUES ('00000000-0000-0000-0000-000000000001', 'MAIN', 'Kho chính', true, true);

CREATE TABLE "ingredient_stock" (
  "ingredient_id" TEXT NOT NULL,
  "warehouse_id" TEXT NOT NULL,
  "qty" DECIMAL(14,3) NOT NULL DEFAULT 0,
  CONSTRAINT "ingredient_stock_pkey" PRIMARY KEY ("ingredient_id", "warehouse_id")
);
CREATE INDEX "ingredient_stock_warehouse_id_idx" ON "ingredient_stock"("warehouse_id");
ALTER TABLE "ingredient_stock" ADD CONSTRAINT "ingredient_stock_ingredient_id_fkey" FOREIGN KEY ("ingredient_id") REFERENCES "ingredients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ingredient_stock" ADD CONSTRAINT "ingredient_stock_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Tồn hiện tại của mọi mã hàng gán vào kho chính
INSERT INTO "ingredient_stock" ("ingredient_id", "warehouse_id", "qty")
SELECT "id", '00000000-0000-0000-0000-000000000001', "current_stock" FROM "ingredients";

ALTER TABLE "kiotviet_orders" ADD COLUMN "branch_id" TEXT;

ALTER TABLE "import_orders" ADD COLUMN "warehouse_id" TEXT;
UPDATE "import_orders" SET "warehouse_id" = '00000000-0000-0000-0000-000000000001' WHERE "warehouse_id" IS NULL;
ALTER TABLE "import_orders" ALTER COLUMN "warehouse_id" SET NOT NULL;
CREATE INDEX "import_orders_warehouse_id_idx" ON "import_orders"("warehouse_id");
ALTER TABLE "import_orders" ADD CONSTRAINT "import_orders_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ingredient_batches" ADD COLUMN "warehouse_id" TEXT;
UPDATE "ingredient_batches" SET "warehouse_id" = '00000000-0000-0000-0000-000000000001' WHERE "warehouse_id" IS NULL;
ALTER TABLE "ingredient_batches" ALTER COLUMN "warehouse_id" SET NOT NULL;
CREATE INDEX "ingredient_batches_warehouse_id_idx" ON "ingredient_batches"("warehouse_id");
ALTER TABLE "ingredient_batches" ADD CONSTRAINT "ingredient_batches_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "stock_transactions" ADD COLUMN "warehouse_id" TEXT;
UPDATE "stock_transactions" SET "warehouse_id" = '00000000-0000-0000-0000-000000000001' WHERE "warehouse_id" IS NULL;
ALTER TABLE "stock_transactions" ALTER COLUMN "warehouse_id" SET NOT NULL;
CREATE INDEX "stock_transactions_warehouse_id_idx" ON "stock_transactions"("warehouse_id");
ALTER TABLE "stock_transactions" ADD CONSTRAINT "stock_transactions_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "stocktake_sessions" ADD COLUMN "warehouse_id" TEXT;
UPDATE "stocktake_sessions" SET "warehouse_id" = '00000000-0000-0000-0000-000000000001' WHERE "warehouse_id" IS NULL;
ALTER TABLE "stocktake_sessions" ALTER COLUMN "warehouse_id" SET NOT NULL;
CREATE INDEX "stocktake_sessions_warehouse_id_idx" ON "stocktake_sessions"("warehouse_id");
ALTER TABLE "stocktake_sessions" ADD CONSTRAINT "stocktake_sessions_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "purchase_returns" ADD COLUMN "warehouse_id" TEXT;
UPDATE "purchase_returns" SET "warehouse_id" = '00000000-0000-0000-0000-000000000001' WHERE "warehouse_id" IS NULL;
ALTER TABLE "purchase_returns" ALTER COLUMN "warehouse_id" SET NOT NULL;
CREATE INDEX "purchase_returns_warehouse_id_idx" ON "purchase_returns"("warehouse_id");
ALTER TABLE "purchase_returns" ADD CONSTRAINT "purchase_returns_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "processing_orders" ADD COLUMN "warehouse_id" TEXT;
UPDATE "processing_orders" SET "warehouse_id" = '00000000-0000-0000-0000-000000000001' WHERE "warehouse_id" IS NULL;
ALTER TABLE "processing_orders" ALTER COLUMN "warehouse_id" SET NOT NULL;
CREATE INDEX "processing_orders_warehouse_id_idx" ON "processing_orders"("warehouse_id");
ALTER TABLE "processing_orders" ADD CONSTRAINT "processing_orders_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "stock_exports" ADD COLUMN "warehouse_id" TEXT;
UPDATE "stock_exports" SET "warehouse_id" = '00000000-0000-0000-0000-000000000001' WHERE "warehouse_id" IS NULL;
ALTER TABLE "stock_exports" ALTER COLUMN "warehouse_id" SET NOT NULL;
CREATE INDEX "stock_exports_warehouse_id_idx" ON "stock_exports"("warehouse_id");
ALTER TABLE "stock_exports" ADD CONSTRAINT "stock_exports_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

INSERT INTO "role_permissions" ("id", "role_id", "resource", "action")
SELECT gen_random_uuid(), r.id, perms.resource, perms.action
FROM "roles" r
CROSS JOIN (VALUES ('warehouses', 'read'), ('warehouses', 'create'), ('warehouses', 'update'), ('warehouses', 'delete')) AS perms(resource, action)
WHERE r.code = 'admin'
ON CONFLICT ("role_id", "resource", "action") DO NOTHING;
