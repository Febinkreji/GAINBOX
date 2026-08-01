-- Up Migration

-- Confirmed required by Surfboard's Register Terminal API
-- (registrationIdentifier) via the official docs — see Phase 2's Store &
-- Device Integration plan. This is the 6-digit code shown when a terminal
-- powers on (or the serial number, for SurfPad/Printer devices) — a
-- physical-device attribute, not something GainBox generates.
-- Nullable, same reasoning as merchants.corporate_id (migration 0029):
-- existing devices have no value yet, and a device doesn't need one until
-- Surfboard Terminal sync is actually attempted.
ALTER TABLE devices
  ADD COLUMN registration_identifier VARCHAR(50);

-- Down Migration

ALTER TABLE devices
  DROP COLUMN IF EXISTS registration_identifier;
