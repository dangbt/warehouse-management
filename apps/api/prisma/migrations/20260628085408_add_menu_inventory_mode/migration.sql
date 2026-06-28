-- AlterTable: menu_items thêm cấu hình trừ tồn + khớp KiotViet
ALTER TABLE "menu_items" ADD COLUMN "kiotviet_product_id" TEXT;
ALTER TABLE "menu_items" ADD COLUMN "inventory_mode" TEXT;
ALTER TABLE "menu_items" ADD COLUMN "direct_ingredient_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "menu_items_kiotviet_product_id_key" ON "menu_items"("kiotviet_product_id");

-- AddForeignKey
ALTER TABLE "menu_items" ADD CONSTRAINT "menu_items_direct_ingredient_id_fkey" FOREIGN KEY ("direct_ingredient_id") REFERENCES "ingredients"("id") ON DELETE SET NULL ON UPDATE CASCADE;
