-- Up Migration

-- Required for payment.service.js's failure handling: if the Surfboard
-- Create Order call throws after the local payment row is already
-- committed, the row is marked 'failed' rather than left silently
-- 'pending' forever. 'failed' was not previously a valid status — without
-- this, that same update would itself throw a CHECK-constraint violation
-- inside the error path it's meant to fix.
ALTER TABLE payments DROP CONSTRAINT payments_status_check;
ALTER TABLE payments ADD CONSTRAINT payments_status_check
  CHECK (status IN ('pending', 'paid', 'refunded', 'cancelled', 'failed'));

-- Down Migration

ALTER TABLE payments DROP CONSTRAINT payments_status_check;
ALTER TABLE payments ADD CONSTRAINT payments_status_check
  CHECK (status IN ('pending', 'paid', 'refunded', 'cancelled'));
