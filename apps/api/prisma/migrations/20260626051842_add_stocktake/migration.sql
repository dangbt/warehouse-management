-- CreateTable
CREATE TABLE "stocktake_sessions" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "note" TEXT,
    "created_by" TEXT NOT NULL,
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stocktake_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stocktake_items" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "ingredient_id" TEXT NOT NULL,
    "system_qty" DECIMAL(10,3) NOT NULL,
    "actual_qty" DECIMAL(10,3) NOT NULL,
    "difference" DECIMAL(10,3) NOT NULL,
    "note" TEXT,

    CONSTRAINT "stocktake_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "stocktake_sessions_code_key" ON "stocktake_sessions"("code");

-- AddForeignKey
ALTER TABLE "stocktake_sessions" ADD CONSTRAINT "stocktake_sessions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stocktake_items" ADD CONSTRAINT "stocktake_items_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "stocktake_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stocktake_items" ADD CONSTRAINT "stocktake_items_ingredient_id_fkey" FOREIGN KEY ("ingredient_id") REFERENCES "ingredients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
