-- Add kiotviet permissions to admin role
INSERT INTO "role_permissions" ("id", "role_id", "resource", "action")
SELECT gen_random_uuid(), r.id, perm.resource, perm.action
FROM "roles" r
CROSS JOIN (VALUES ('kiotviet', 'read'), ('kiotviet', 'sync'), ('kiotviet', 'deduct')) AS perm(resource, action)
WHERE r.code = 'admin'
ON CONFLICT ("role_id", "resource", "action") DO NOTHING;
