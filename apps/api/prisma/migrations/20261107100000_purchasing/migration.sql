CREATE TABLE "purchase_requests" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "note" TEXT,
    "created_by" TEXT NOT NULL,
    "approved_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "purchase_requests_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "purchase_requests_code_key" ON "purchase_requests"("code");

CREATE TABLE "purchase_request_items" (
    "id" TEXT NOT NULL,
    "request_id" TEXT NOT NULL,
    "ingredient_id" TEXT NOT NULL,
    "quantity" DECIMAL(10,3) NOT NULL,
    "buy_unit" TEXT,
    "buy_factor" DECIMAL(12,4) NOT NULL DEFAULT 1,
    "supplier_id" TEXT,
    "unit_price" DECIMAL(12,2) NOT NULL DEFAULT 0,
    CONSTRAINT "purchase_request_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "purchase_orders" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'UNRECEIVED',
    "supplier_id" TEXT NOT NULL,
    "request_id" TEXT,
    "note" TEXT,
    "total_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "purchase_orders_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "purchase_orders_code_key" ON "purchase_orders"("code");

CREATE TABLE "purchase_order_items" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "ingredient_id" TEXT NOT NULL,
    "quantity" DECIMAL(10,3) NOT NULL,
    "received_qty" DECIMAL(10,3) NOT NULL DEFAULT 0,
    "buy_unit" TEXT,
    "buy_factor" DECIMAL(12,4) NOT NULL DEFAULT 1,
    "unit_price" DECIMAL(12,2) NOT NULL DEFAULT 0,
    CONSTRAINT "purchase_order_items_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "import_orders" ADD COLUMN "purchase_order_id" TEXT;
CREATE INDEX "import_orders_purchase_order_id_idx" ON "import_orders"("purchase_order_id");

ALTER TABLE "purchase_requests" ADD CONSTRAINT "purchase_requests_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "purchase_request_items" ADD CONSTRAINT "purchase_request_items_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "purchase_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "purchase_request_items" ADD CONSTRAINT "purchase_request_items_ingredient_id_fkey" FOREIGN KEY ("ingredient_id") REFERENCES "ingredients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "purchase_request_items" ADD CONSTRAINT "purchase_request_items_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "purchase_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "purchase_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_ingredient_id_fkey" FOREIGN KEY ("ingredient_id") REFERENCES "ingredients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "import_orders" ADD CONSTRAINT "import_orders_purchase_order_id_fkey" FOREIGN KEY ("purchase_order_id") REFERENCES "purchase_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "role_permissions" ("id", "role_id", "resource", "action")
SELECT gen_random_uuid(), r.id, perms.resource, perms.action
FROM "roles" r
CROSS JOIN (VALUES
  ('purchase_requests', 'read'),
  ('purchase_requests', 'create'),
  ('purchase_requests', 'approve'),
  ('purchase_orders', 'read'),
  ('purchase_orders', 'create'),
  ('purchase_orders', 'update')
) AS perms(resource, action)
WHERE r.code = 'admin'
ON CONFLICT ("role_id", "resource", "action") DO NOTHING;
