-- WMS-8: trạng thái chứng từ xuất kho (POSTED = đã ghi sổ, CANCELLED = đã huỷ/đảo bút toán)
ALTER TABLE "stock_exports" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'POSTED';
