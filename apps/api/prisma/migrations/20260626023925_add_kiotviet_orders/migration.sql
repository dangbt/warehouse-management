-- CreateTable
CREATE TABLE "kiotviet_orders" (
    "id" TEXT NOT NULL,
    "kiotviet_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "customer_name" TEXT,
    "total_amount" DECIMAL(14,2) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SYNCED',
    "deducted" BOOLEAN NOT NULL DEFAULT false,
    "order_date" TIMESTAMP(3) NOT NULL,
    "synced_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "kiotviet_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kiotviet_order_items" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "product_name" TEXT NOT NULL,
    "menu_item_id" TEXT,
    "quantity" INTEGER NOT NULL,
    "price" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "kiotviet_order_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "kiotviet_orders_kiotviet_id_key" ON "kiotviet_orders"("kiotviet_id");

-- CreateIndex
CREATE INDEX "kiotviet_orders_order_date_idx" ON "kiotviet_orders"("order_date");

-- AddForeignKey
ALTER TABLE "kiotviet_order_items" ADD CONSTRAINT "kiotviet_order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "kiotviet_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kiotviet_order_items" ADD CONSTRAINT "kiotviet_order_items_menu_item_id_fkey" FOREIGN KEY ("menu_item_id") REFERENCES "menu_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;
