-- Foundational RBAC reference data — roles, permissions, and role-permission
-- grants that Authorization actually reads at runtime (see
-- modules/authorization/authorization.service.js). No longer illustrative:
-- this is the enforced permission set for the current phase.
--
-- Permission naming is "<resource>.<read|write>" — coarser by design, this
-- phase distinguishes read vs write per resource, not per specific
-- operation (create/update/delete all count as "write"). Replaces this
-- file's earlier "<resource>:<action>" scheme (merchant:manage,
-- payment:refund, ...), which predates RBAC's actual design and was never
-- read by any real authorization check.
--
-- Deliberately NOT seeding merchant_staff/user_roles: which real user holds
-- which role is tenant data, not reference data — same reasoning this file
-- already applies to merchants/branches/payments.
--
-- Idempotent: safe to run more than once.

INSERT INTO roles (name, description) VALUES
  ('platform-admin', 'GainBox internal administrator — full cross-merchant access'),
  ('merchant-owner', 'Full control over a single merchant account'),
  ('merchant-staff', 'Day-to-day operational access within a merchant account'),
  ('viewer', 'Read-only access within a merchant account'),
  ('customer', 'End customer purchasing memberships or meal plans')
ON CONFLICT (name) DO NOTHING;

INSERT INTO permissions (name, description) VALUES
  ('merchant.read', 'View merchant profile and business details'),
  ('merchant.write', 'Create or update merchant profile and business details'),
  ('branch.read', 'View branch details'),
  ('branch.write', 'Create, update, or remove branches'),
  ('device.read', 'View device details'),
  ('device.write', 'Register, update, or remove devices'),
  ('membership.read', 'View membership plans and subscriptions'),
  ('membership.write', 'Create, update, or cancel membership plans and subscriptions'),
  ('platform.read', 'View platform-wide, cross-merchant data'),
  ('platform.write', 'Perform platform-wide administrative actions')
ON CONFLICT (name) DO NOTHING;

-- platform-admin: every permission.
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permissions p
WHERE r.name = 'platform-admin'
ON CONFLICT DO NOTHING;

-- merchant-owner: full control within their own merchant(s), no platform.*.
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p
  ON p.name IN ('merchant.read', 'merchant.write', 'branch.read', 'branch.write',
                'device.read', 'device.write', 'membership.read', 'membership.write')
WHERE r.name = 'merchant-owner'
ON CONFLICT DO NOTHING;

-- merchant-staff: operates branches/devices/memberships day to day, can't
-- edit the merchant profile itself.
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p
  ON p.name IN ('merchant.read', 'branch.read', 'branch.write',
                'device.read', 'device.write', 'membership.read', 'membership.write')
WHERE r.name = 'merchant-staff'
ON CONFLICT DO NOTHING;

-- viewer: read-only, everywhere they have access.
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p
  ON p.name IN ('merchant.read', 'branch.read', 'device.read', 'membership.read')
WHERE r.name = 'viewer'
ON CONFLICT DO NOTHING;
