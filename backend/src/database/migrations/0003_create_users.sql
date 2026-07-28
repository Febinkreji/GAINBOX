-- Up Migration

-- Represents any authenticated identity — merchant owner, merchant staff,
-- or (future) a customer on the Customer App. Which merchant(s) a user
-- belongs to, and with what role, lives in merchant_staff, not here.
CREATE TABLE users (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firebase_uid   VARCHAR(128) NOT NULL,
  email          CITEXT NOT NULL,
  display_name   VARCHAR(255),
  status         VARCHAR(20) NOT NULL DEFAULT 'active'
                   CHECK (status IN ('active', 'invited', 'disabled')),
  -- Self-referencing: which existing user sent this invite. Nullable
  -- because the first users on the platform (and Firebase self-signups)
  -- have no inviter.
  invited_by     UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at     TIMESTAMPTZ,

  CONSTRAINT users_firebase_uid_uq UNIQUE (firebase_uid),
  CONSTRAINT users_email_uq UNIQUE (email)
);

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX users_invited_by_idx ON users (invited_by);
-- Hot path: "find the active user record for this deleted_at IS NULL scope".
CREATE INDEX users_active_idx ON users (id) WHERE deleted_at IS NULL;

-- Down Migration

DROP TABLE IF EXISTS users;
