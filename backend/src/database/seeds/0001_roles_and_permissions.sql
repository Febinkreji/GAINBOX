-- Foundational RBAC reference data only — roles, a representative (not
-- exhaustive) permission set, and illustrative role-permission mappings.
-- Deliberately NOT seeding merchants/branches/payments: that's demo data,
-- and frontend/src/pages/Dashboard/dummyData.js already owns that role.
-- Idempotent: safe to run more than once.

INSERT INTO roles (name, description) VALUES
  ('merchant-owner', 'Full control over a merchant account'),
  ('merchant-staff', 'Limited operational access within a merchant account'),
  ('platform-admin', 'GainBox internal administrator'),
  ('customer', 'End customer purchasing memberships or meal plans')
ON CONFLICT (name) DO NOTHING;

INSERT INTO permissions (name, description) VALUES
  ('merchant:manage', 'Update merchant profile and business branding'),
  ('branch:manage', 'Create and manage branches'),
  ('device:manage', 'Register and configure payment terminals'),
  ('membership_plan:manage', 'Create and manage membership plans'),
  ('payment:view', 'View payment and receipt history'),
  ('payment:refund', 'Issue refunds and cancel payments'),
  ('staff:manage', 'Invite and manage merchant staff'),
  ('analytics:view', 'View analytics and reporting')
ON CONFLICT (name) DO NOTHING;

-- merchant-owner: everything.
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permissions p
WHERE r.name = 'merchant-owner'
ON CONFLICT DO NOTHING;

-- merchant-staff: day-to-day operations, no refunds, no staff management.
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p
  ON p.name IN ('branch:manage', 'device:manage', 'membership_plan:manage', 'payment:view', 'analytics:view')
WHERE r.name = 'merchant-staff'
ON CONFLICT DO NOTHING;

-- platform-admin: everything, same as merchant-owner today.
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permissions p
WHERE r.name = 'platform-admin'
ON CONFLICT DO NOTHING;
