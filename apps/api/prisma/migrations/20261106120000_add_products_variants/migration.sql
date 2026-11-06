-- Chỉ thêm bảng mới + cột nullable/có default vào ingredients; dữ liệu cũ giữ nguyên (product_id/sku/barcode = NULL).

-- AlterTable
ALTER TABLE "ingredients" ADD COLUMN "product_id" TEXT,
ADD COLUMN "sku" TEXT,
ADD COLUMN "barcode" TEXT,
ADD COLUMN "sale_price" DECIMAL(12,2),
ADD COLUMN "variant_key" TEXT,
ADD COLUMN "is_active" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "group_id" TEXT,
    "brand" TEXT,
    "unit" TEXT NOT NULL DEFAULT 'cái',
    "base_price" DECIMAL(12,2),
    "description" TEXT,
    "image_url" TEXT,
    "sku_template" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_attributes" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sort" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "product_attributes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attribute_values" (
    "id" TEXT NOT NULL,
    "attribute_id" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "sort" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "attribute_values_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_attribute_links" (
    "product_id" TEXT NOT NULL,
    "attribute_id" TEXT NOT NULL,
    "sort" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "product_attribute_links_pkey" PRIMARY KEY ("product_id","attribute_id")
);

-- CreateTable
CREATE TABLE "item_attribute_values" (
    "ingredient_id" TEXT NOT NULL,
    "attribute_id" TEXT NOT NULL,
    "attribute_value_id" TEXT NOT NULL,

    CONSTRAINT "item_attribute_values_pkey" PRIMARY KEY ("ingredient_id","attribute_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "products_code_key" ON "products"("code");
CREATE UNIQUE INDEX "product_attributes_code_key" ON "product_attributes"("code");
CREATE UNIQUE INDEX "attribute_values_attribute_id_value_key" ON "attribute_values"("attribute_id", "value");
CREATE UNIQUE INDEX "attribute_values_attribute_id_code_key" ON "attribute_values"("attribute_id", "code");
CREATE UNIQUE INDEX "ingredients_sku_key" ON "ingredients"("sku");
CREATE UNIQUE INDEX "ingredients_barcode_key" ON "ingredients"("barcode");
CREATE INDEX "ingredients_product_id_idx" ON "ingredients"("product_id");
CREATE UNIQUE INDEX "ingredients_product_id_variant_key_key" ON "ingredients"("product_id", "variant_key");

-- AddForeignKey
ALTER TABLE "ingredients" ADD CONSTRAINT "ingredients_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "attribute_values" ADD CONSTRAINT "attribute_values_attribute_id_fkey" FOREIGN KEY ("attribute_id") REFERENCES "product_attributes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "product_attribute_links" ADD CONSTRAINT "product_attribute_links_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "product_attribute_links" ADD CONSTRAINT "product_attribute_links_attribute_id_fkey" FOREIGN KEY ("attribute_id") REFERENCES "product_attributes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "item_attribute_values" ADD CONSTRAINT "item_attribute_values_ingredient_id_fkey" FOREIGN KEY ("ingredient_id") REFERENCES "ingredients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "item_attribute_values" ADD CONSTRAINT "item_attribute_values_attribute_value_id_fkey" FOREIGN KEY ("attribute_value_id") REFERENCES "attribute_values"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
