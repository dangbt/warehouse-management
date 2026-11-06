-- WMS-6: giá vốn trên giao dịch kho + cấu hình phương pháp tính giá xuất kho
ALTER TABLE "stock_transactions" ADD COLUMN "unit_cost" DECIMAL(14,4);
ALTER TABLE "stock_transactions" ADD COLUMN "total_cost" DECIMAL(14,2);

CREATE TABLE "inventory_settings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "costing_method" TEXT NOT NULL DEFAULT 'AVG_PERIOD',
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "inventory_settings_pkey" PRIMARY KEY ("id")
);
INSERT INTO "inventory_settings" ("id", "costing_method", "updated_at") VALUES ('default', 'AVG_PERIOD', CURRENT_TIMESTAMP);

-- Backfill nhập: giá vốn = giá trên giao dịch
UPDATE "stock_transactions"
SET "unit_cost" = "unit_price",
    "total_cost" = COALESCE(ABS("total_price"), ABS("quantity") * "unit_price")
WHERE "type" IN ('IMPORT', 'PROCESS_IN') AND "unit_price" IS NOT NULL;

-- Backfill xuất / điều chỉnh: giá có sẵn trên giao dịch, không có thì giá vốn hiện hành của NL
UPDATE "stock_transactions" st
SET "unit_cost" = COALESCE(st."unit_price", i."cost_per_unit"),
    "total_cost" = COALESCE(ABS(st."total_price"), ABS(st."quantity") * COALESCE(st."unit_price", i."cost_per_unit"))
FROM "ingredients" i
WHERE i."id" = st."ingredient_id"
  AND st."unit_cost" IS NULL
  AND st."type" IN ('EXPORT', 'ORDER_DEDUCT', 'PROCESS_OUT', 'RETURN', 'STOCKTAKE_ADJUST');
