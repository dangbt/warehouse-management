-- Phiếu chuyển kho giữa các kho (WMS-12).
CREATE TABLE "stock_transfers" (
  "id" TEXT NOT NULL,
  "voucher_no" TEXT NOT NULL,
  "voucher_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "from_warehouse_id" TEXT NOT NULL,
  "to_warehouse_id" TEXT NOT NULL,
  "note" TEXT,
  "created_by" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "stock_transfers_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "stock_transfers_voucher_no_key" ON "stock_transfers"("voucher_no");
CREATE INDEX "stock_transfers_from_warehouse_id_idx" ON "stock_transfers"("from_warehouse_id");
CREATE INDEX "stock_transfers_to_warehouse_id_idx" ON "stock_transfers"("to_warehouse_id");
ALTER TABLE "stock_transfers" ADD CONSTRAINT "stock_transfers_from_warehouse_id_fkey" FOREIGN KEY ("from_warehouse_id") REFERENCES "warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "stock_transfers" ADD CONSTRAINT "stock_transfers_to_warehouse_id_fkey" FOREIGN KEY ("to_warehouse_id") REFERENCES "warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "stock_transfer_items" (
  "id" TEXT NOT NULL,
  "transfer_id" TEXT NOT NULL,
  "ingredient_id" TEXT NOT NULL,
  "quantity" DECIMAL(10,3) NOT NULL,
  CONSTRAINT "stock_transfer_items_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "stock_transfer_items" ADD CONSTRAINT "stock_transfer_items_transfer_id_fkey" FOREIGN KEY ("transfer_id") REFERENCES "stock_transfers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "stock_transfer_items" ADD CONSTRAINT "stock_transfer_items_ingredient_id_fkey" FOREIGN KEY ("ingredient_id") REFERENCES "ingredients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ingredient_batches" ADD COLUMN "transfer_id" TEXT;
CREATE INDEX "ingredient_batches_transfer_id_idx" ON "ingredient_batches"("transfer_id");

ALTER TABLE "stock_transactions" ADD COLUMN "transfer_id" TEXT;
CREATE INDEX "stock_transactions_transfer_id_idx" ON "stock_transactions"("transfer_id");
ALTER TABLE "stock_transactions" ADD CONSTRAINT "stock_transactions_transfer_id_fkey" FOREIGN KEY ("transfer_id") REFERENCES "stock_transfers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "role_permissions" ("id", "role_id", "resource", "action")
SELECT gen_random_uuid(), r.id, perms.resource, perms.action
FROM "roles" r
CROSS JOIN (VALUES ('stock_transfers', 'read'), ('stock_transfers', 'create'), ('stock_transfers', 'approve')) AS perms(resource, action)
WHERE r.code = 'admin'
ON CONFLICT ("role_id", "resource", "action") DO NOTHING;
