-- Nhớ mapping tên hàng trên hoá đơn điện tử của NCC → nguyên liệu + hệ số quy đổi.
CREATE TABLE "supplier_item_mappings" (
    "id" TEXT NOT NULL,
    "supplier_id" TEXT NOT NULL,
    "item_key" TEXT NOT NULL,
    "unit_key" TEXT NOT NULL DEFAULT '',
    "item_name" TEXT NOT NULL,
    "unit" TEXT NOT NULL DEFAULT '',
    "ingredient_id" TEXT NOT NULL,
    "factor" DECIMAL(12,4) NOT NULL DEFAULT 1,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "supplier_item_mappings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "supplier_item_mappings_supplier_id_item_key_unit_key_key" ON "supplier_item_mappings"("supplier_id", "item_key", "unit_key");

ALTER TABLE "supplier_item_mappings" ADD CONSTRAINT "supplier_item_mappings_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "supplier_item_mappings" ADD CONSTRAINT "supplier_item_mappings_ingredient_id_fkey" FOREIGN KEY ("ingredient_id") REFERENCES "ingredients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
