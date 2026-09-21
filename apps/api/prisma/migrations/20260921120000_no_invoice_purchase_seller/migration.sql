-- AlterTable
ALTER TABLE "suppliers" ADD COLUMN     "id_number" TEXT,
ADD COLUMN     "is_individual" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "import_orders" ADD COLUMN     "purchase_address" TEXT;

