-- Add purchase_returns and supplier_payments permissions to admin role
INSERT INTO "role_permissions" ("id", "role_id", "resource", "action")
SELECT gen_random_uuid(), r.id, perms.resource, perms.action
FROM "roles" r
CROSS JOIN (VALUES
  ('purchase_returns', 'read'),
  ('purchase_returns', 'create'),
  ('supplier_payments', 'read'),
  ('supplier_payments', 'create')
) AS perms(resource, action)
WHERE r.code = 'admin'
ON CONFLICT ("role_id", "resource", "action") DO NOTHING;
