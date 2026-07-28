-- Up Migration

-- `type` is intentionally NOT a CHECK-constrained enum, unlike `status`
-- fields elsewhere: notification types are an open, extensible set (any
-- future event source can introduce a new one), not a small closed state
-- machine — constraining it would force a migration every time a new
-- notification-worthy event is added.
-- No updated_at: a notification isn't edited, only read (read_at) or
-- dismissed (deleted_at).
CREATE TABLE notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type        VARCHAR(50) NOT NULL,
  message     VARCHAR(500) NOT NULL,
  read_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at  TIMESTAMPTZ
);

CREATE INDEX notifications_user_id_idx ON notifications (user_id);
-- Hot path: "unread notifications for this user".
CREATE INDEX notifications_user_unread_idx
  ON notifications (user_id, read_at) WHERE deleted_at IS NULL;
CREATE INDEX notifications_created_at_id_idx ON notifications (created_at, id);

-- Down Migration

DROP TABLE IF EXISTS notifications;
