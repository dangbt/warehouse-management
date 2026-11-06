-- CreateTable
CREATE TABLE "tax_period_closes" (
    "id" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "regime" TEXT NOT NULL,
    "carried_forward_in" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "snapshot" JSONB NOT NULL,
    "closed_by_id" TEXT,
    "closed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tax_period_closes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tax_period_closes_period_key" ON "tax_period_closes"("period");

-- AddForeignKey
ALTER TABLE "tax_period_closes" ADD CONSTRAINT "tax_period_closes_closed_by_id_fkey" FOREIGN KEY ("closed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

