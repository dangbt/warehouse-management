-- CreateTable
CREATE TABLE "ingredient_batches" (
    "id" TEXT NOT NULL,
    "ingredient_id" TEXT NOT NULL,
    "import_order_item_id" TEXT,
    "batch_code" TEXT NOT NULL,
    "quantity" DECIMAL(10,3) NOT NULL,
    "cost_per_unit" DECIMAL(12,2) NOT NULL,
    "expiry_date" DATE,
    "received_date" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ingredient_batches_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ingredient_batches_import_order_item_id_key" ON "ingredient_batches"("import_order_item_id");

-- CreateIndex
CREATE INDEX "ingredient_batches_ingredient_id_status_idx" ON "ingredient_batches"("ingredient_id", "status");

-- AddForeignKey
ALTER TABLE "ingredient_batches" ADD CONSTRAINT "ingredient_batches_ingredient_id_fkey" FOREIGN KEY ("ingredient_id") REFERENCES "ingredients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ingredient_batches" ADD CONSTRAINT "ingredient_batches_import_order_item_id_fkey" FOREIGN KEY ("import_order_item_id") REFERENCES "import_order_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;
