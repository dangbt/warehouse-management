-- AlterTable
ALTER TABLE "ingredients" ADD COLUMN     "base_factor" DECIMAL(12,6),
ADD COLUMN     "group_id" TEXT,
ADD COLUMN     "source_ingredient_id" TEXT,
ADD COLUMN     "yield_ratio" DECIMAL(10,4);

-- CreateTable
CREATE TABLE "ingredient_groups" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "base_unit" TEXT NOT NULL,
    "min_stock" DECIMAL(10,3),
    "note" TEXT,

    CONSTRAINT "ingredient_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ingredient_units" (
    "id" TEXT NOT NULL,
    "ingredient_id" TEXT NOT NULL,
    "unit_name" TEXT NOT NULL,
    "factor" DECIMAL(12,4) NOT NULL,
    "is_default_buy" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ingredient_units_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "processing_orders" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "source_ingredient_id" TEXT NOT NULL,
    "source_qty" DECIMAL(10,3) NOT NULL,
    "output_ingredient_id" TEXT NOT NULL,
    "expected_qty" DECIMAL(10,3) NOT NULL,
    "output_qty" DECIMAL(10,3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "note" TEXT,
    "created_by" TEXT NOT NULL,
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "processing_orders_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ingredient_groups_name_key" ON "ingredient_groups"("name");

-- CreateIndex
CREATE UNIQUE INDEX "ingredient_units_ingredient_id_unit_name_key" ON "ingredient_units"("ingredient_id", "unit_name");

-- CreateIndex
CREATE UNIQUE INDEX "processing_orders_code_key" ON "processing_orders"("code");

-- AddForeignKey
ALTER TABLE "ingredients" ADD CONSTRAINT "ingredients_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "ingredient_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ingredients" ADD CONSTRAINT "ingredients_source_ingredient_id_fkey" FOREIGN KEY ("source_ingredient_id") REFERENCES "ingredients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ingredient_units" ADD CONSTRAINT "ingredient_units_ingredient_id_fkey" FOREIGN KEY ("ingredient_id") REFERENCES "ingredients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "processing_orders" ADD CONSTRAINT "processing_orders_source_ingredient_id_fkey" FOREIGN KEY ("source_ingredient_id") REFERENCES "ingredients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "processing_orders" ADD CONSTRAINT "processing_orders_output_ingredient_id_fkey" FOREIGN KEY ("output_ingredient_id") REFERENCES "ingredients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "processing_orders" ADD CONSTRAINT "processing_orders_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
