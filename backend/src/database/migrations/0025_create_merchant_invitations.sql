-- Up Migration

-- Merchant Onboarding's invitation record — see modules/invitation. `role`
-- is stored as a proper FK to roles(id) (role_id), not a free string, for
-- referential integrity; invitation.repository.js exposes it to callers as
-- a role NAME (joined), matching how the rest of this API deals in
-- human-readable role names rather than opaque UUIDs.
CREATE TABLE merchant_invitations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id   UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  email         CITEXT NOT NULL,
  display_name  VARCHAR(255),
  -- RESTRICT: an actively-referenced role can't be deleted out from under
  -- a pending invitation — same rule merchant_staff.role_id already uses.
  role_id       UUID NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
  status        VARCHAR(20) NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')),
  -- SHA-256 hex digest of the invitation token. The plaintext token is
  -- never persisted anywhere — only returned once, at creation/resend
  -- time (see invitation.service.js). Unlike a password, this is a
  -- high-entropy random value, so a fast, unsalted cryptographic hash is
  -- the correct choice: brute-forcing a 256-bit random token is infeasible
  -- regardless of hash speed, unlike a low-entropy human-chosen password.
  token_hash    VARCHAR(64) NOT NULL,
  expires_at    TIMESTAMPTZ NOT NULL,
  accepted_at   TIMESTAMPTZ,
  created_by    UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT merchant_invitations_token_hash_uq UNIQUE (token_hash)
);

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON merchant_invitations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX merchant_invitations_merchant_id_idx ON merchant_invitations (merchant_id);
CREATE INDEX merchant_invitations_email_idx ON merchant_invitations (email);
CREATE INDEX merchant_invitations_role_id_idx ON merchant_invitations (role_id);
-- Expiration lookup: "which pending invitations have (or are about to)
-- expire" — the primary read path for the accept flow's expiry check and
-- any future expiration sweep.
CREATE INDEX merchant_invitations_status_expires_at_idx ON merchant_invitations (status, expires_at);
-- Only one PENDING invitation per (merchant, email) at a time — a second
-- invite attempt while one is already outstanding is a conflict, not a
-- new row (see invitation.service.js's create()).
CREATE UNIQUE INDEX merchant_invitations_pending_merchant_email_uq
  ON merchant_invitations (merchant_id, email) WHERE status = 'pending';

-- Down Migration

DROP TABLE IF EXISTS merchant_invitations;
