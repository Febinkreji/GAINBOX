-- Up Migration

-- Supports the Development Bootstrap module (see
-- src/bootstrap/platformAdminBootstrap.js): a platform-admin can be
-- provisioned by email alone, before that person has ever signed in with
-- Google — there is no Firebase UID yet at that point in time. Identity
-- Sync links the real Firebase UID to this row the moment that email signs
-- in for the first time (see identitySync.service.js's "unclaimed" lookup),
-- instead of creating a second row with the same email. The existing
-- UNIQUE constraint on firebase_uid (users_firebase_uid_uq) is unaffected —
-- Postgres treats multiple NULLs in a unique column as distinct, so this
-- only relaxes "every row must have one", not "no two rows may share one".
ALTER TABLE users ALTER COLUMN firebase_uid DROP NOT NULL;

-- Down Migration

ALTER TABLE users ALTER COLUMN firebase_uid SET NOT NULL;
