-- CreateTable
CREATE TABLE "tax_settings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "regime" TEXT NOT NULL DEFAULT 'VAT_DEDUCTION',
    "company_name" TEXT,
    "tax_code" TEXT,
    "address" TEXT,
    "period_type" TEXT NOT NULL DEFAULT 'QUARTER',
    "default_output_vat_rate" TEXT NOT NULL DEFAULT '8',
    "prices_include_vat" BOOLEAN NOT NULL DEFAULT true,
    "household_vat_percent" DECIMAL(5,2) NOT NULL DEFAULT 3,
    "household_pit_percent" DECIMAL(5,2) NOT NULL DEFAULT 1.5,
    "household_exempt_threshold" DECIMAL(14,2) NOT NULL DEFAULT 200000000,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tax_settings_pkey" PRIMARY KEY ("id")
);

-- Seed tax permissions to admin role
INSERT INTO "role_permissions" ("id", "role_id", "resource", "action")
SELECT gen_random_uuid(), r.id, perms.resource, perms.action
FROM "roles" r
CROSS JOIN (VALUES
  ('tax', 'read'),
  ('tax', 'manage')
) AS perms(resource, action)
WHERE r.code = 'admin'
ON CONFLICT ("role_id", "resource", "action") DO NOTHING;
