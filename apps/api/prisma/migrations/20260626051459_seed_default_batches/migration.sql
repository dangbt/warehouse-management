-- Data migration: Create a default batch for each existing ingredient using their currentStock and costPerUnit
INSERT INTO "ingredient_batches" ("id", "ingredient_id", "batch_code", "quantity", "cost_per_unit", "received_date", "status", "note", "created_at")
SELECT
  gen_random_uuid(),
  i."id",
  'INIT-' || LEFT(i."id", 8),
  i."current_stock",
  i."cost_per_unit",
  i."created_at",
  'ACTIVE',
  'Lô khởi tạo từ tồn kho ban đầu',
  NOW()
FROM "ingredients" i
WHERE i."current_stock" > 0;
