-- Up Migration

-- gen_random_uuid() for all primary keys — see architecture notes on UUID strategy.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Case-insensitive text, used for users.email so uniqueness/lookups don't
-- depend on the application remembering to lowercase every write.
CREATE EXTENSION IF NOT EXISTS citext;

-- Down Migration

DROP EXTENSION IF EXISTS citext;
DROP EXTENSION IF EXISTS pgcrypto;
