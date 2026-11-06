-- WMS-7: khoá sổ kho + đánh dấu lỗi trừ kho đơn KiotViet
ALTER TABLE "inventory_settings" ADD COLUMN "locked_until" DATE;
ALTER TABLE "kiotviet_orders" ADD COLUMN "deduct_error" TEXT;
