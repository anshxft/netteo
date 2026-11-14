-- ============================================================================
-- 003_lock_down_access.sql
-- Closes the hole where the public browser key could read and rewrite private tables.
-- Fresh installs do NOT need this file: schema.sql already has the final shape.
--
-- BEFORE this migration, policies like "Public update obligations ... USING (true)" let anyone holding the
-- public anon key run, straight from the browser:
--     update obligations set status = 'accepted', amount_units = 1 where id = '...'
-- skipping every signature check in the API. They also let every visitor read every group's obligations.
--
-- AFTER: the private tables have row-level security on and NO policy for anon/authenticated, so only the API
-- (service role) can touch them, and the API returns just the rows a signed-in wallet may see.
--
-- ORDER OF OPERATIONS: deploy the new app (with SESSION_SECRET and SUPABASE_SERVICE_ROLE_KEY set) first, then
-- run this. Running it first locks out the old app, which wrote to these tables directly.
-- Run once, in a transaction, on a database you have backed up.
-- ============================================================================

BEGIN;

-- 0. Replay-protection table. Databases created before it was added to schema.sql do not have it at all, and
--    the API relies on it to refuse a replayed signature across serverless instances.
CREATE TABLE IF NOT EXISTS consumed_nonces (
  nonce VARCHAR(128) PRIMARY KEY,
  challenge_timestamp BIGINT NOT NULL,
  consumed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_consumed_nonces_timestamp ON consumed_nonces(challenge_timestamp);

-- 1. Remove every public read/insert/update policy on the private tables ------------------------------------

DROP POLICY IF EXISTS "Public read groups" ON groups;
DROP POLICY IF EXISTS "Public insert groups" ON groups;
DROP POLICY IF EXISTS "Public update groups" ON groups;

DROP POLICY IF EXISTS "Public read group_members" ON group_members;
DROP POLICY IF EXISTS "Public insert group_members" ON group_members;
DROP POLICY IF EXISTS "Public update group_members" ON group_members;

DROP POLICY IF EXISTS "Public read obligations" ON obligations;
DROP POLICY IF EXISTS "Public insert obligations" ON obligations;
DROP POLICY IF EXISTS "Public update obligations" ON obligations;

DROP POLICY IF EXISTS "Public read cycles" ON cycles;
DROP POLICY IF EXISTS "Public insert cycles" ON cycles;
DROP POLICY IF EXISTS "Public update cycles" ON cycles;

DROP POLICY IF EXISTS "Public read cycle_obligations" ON cycle_obligations;
DROP POLICY IF EXISTS "Public insert cycle_obligations" ON cycle_obligations;

DROP POLICY IF EXISTS "Public insert consumed_nonces" ON consumed_nonces;
DROP POLICY IF EXISTS "Public select consumed_nonces" ON consumed_nonces;

-- Make sure RLS is on for all of them (a table with RLS on and no policy denies anon entirely).
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE obligations ENABLE ROW LEVEL SECURITY;
ALTER TABLE cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE cycle_obligations ENABLE ROW LEVEL SECURITY;
ALTER TABLE consumed_nonces ENABLE ROW LEVEL SECURITY;

-- Only the API (service role) touches the nonce table.
DROP POLICY IF EXISTS "Service role manages consumed_nonces" ON consumed_nonces;
CREATE POLICY "Service role manages consumed_nonces" ON consumed_nonces
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 2. Columns the API now fills in ---------------------------------------------------------------------------

ALTER TABLE obligations ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ;
ALTER TABLE obligations ADD COLUMN IF NOT EXISTS disputed_at TIMESTAMPTZ;

-- The contract also has a Cancelled state. (Postgres names an inline CHECK <table>_<column>_check.)
ALTER TABLE cycles DROP CONSTRAINT IF EXISTS cycles_state_check;
ALTER TABLE cycles ADD CONSTRAINT cycles_state_check
  CHECK (state IN ('Funding', 'ReadyToSettle', 'Completed', 'Expired', 'Refunded', 'Cancelled'));

-- 3. Remove the fake seed data that enable_writes.sql inserted -----------------------------------------------
-- Three "accepted" obligations between 0x1111..., 0x2222... and 0x3333... (addresses nobody controls) would
-- otherwise be netted into real cycles. Only the exact seed ids are touched.

DELETE FROM obligations WHERE id IN (
  '00000000-0000-0000-0000-000000000011',
  '00000000-0000-0000-0000-000000000012',
  '00000000-0000-0000-0000-000000000013'
);
DELETE FROM group_members WHERE group_id = '00000000-0000-0000-0000-000000000001';
DELETE FROM groups WHERE id = '00000000-0000-0000-0000-000000000001';

COMMIT;
