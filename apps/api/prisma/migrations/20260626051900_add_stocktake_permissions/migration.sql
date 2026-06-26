-- Add stocktake permissions to existing admin role
INSERT INTO "role_permissions" ("id", "role_id", "resource", "action")
SELECT gen_random_uuid(), r.id, p.resource, p.action
FROM "roles" r
CROSS JOIN (
  VALUES ('stocktake', 'read'), ('stocktake', 'create'), ('stocktake', 'complete')
) AS p(resource, action)
WHERE r.code = 'admin'
ON CONFLICT ("role_id", "resource", "action") DO NOTHING;
