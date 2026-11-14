-- ============================================================================
-- 002_multi_token.sql
-- Upgrades a database created from the original single-token schema.sql to
-- the multi-token, per-kernel shape. Fresh installs do NOT need this file:
-- schema.sql already contains the final shape.
--
-- WHAT THIS DOES
--   1. Adds token_address to obligations and cycles (additive, defaults to MUSD,
--      which is what every pre-existing row was).
--   2. Widens indexer_cursor.id. 'mezo_mainnet_' + a 42-char address is 55
--      characters, which never fit the original VARCHAR(50), so cursor writes
--      were failing and the indexer re-scanned from its start block every run.
--   3. DESTRUCTIVE: drops and recreates cycle_projection and
--      participant_position_projection so a kernel is part of their keys, then
--      clears indexer_cursor so the indexer replays from chain.
--
-- WHY STEP 3 IS SAFE
--   Both projections are read models rebuilt entirely from on-chain events
--   (architecture.md ADR-06). indexed_events is kept untouched. Run this BEFORE
--   the first mainnet indexing, or accept a full replay afterwards. Do not run
--   it if you have written to those two tables by hand.
--
-- Apply once, in a transaction, against a database you have backed up.
-- ============================================================================

BEGIN;

-- 1. Token columns ------------------------------------------------------------

ALTER TABLE obligations
  ADD COLUMN IF NOT EXISTS token_address VARCHAR(42) NOT NULL
  DEFAULT '0xdd468a1ddc392dcdbef6db6e34e89aa338f9f186';

ALTER TABLE cycles
  ADD COLUMN IF NOT EXISTS token_address VARCHAR(42) NOT NULL
  DEFAULT '0xdd468a1ddc392dcdbef6db6e34e89aa338f9f186';

ALTER TABLE cycles
  ADD COLUMN IF NOT EXISTS kernel_address VARCHAR(42);

-- 2. Cursor id width ----------------------------------------------------------

ALTER TABLE indexer_cursor ALTER COLUMN id TYPE VARCHAR(80);

-- 3. Rebuild projections keyed by (kernel, cycle) -----------------------------

DROP TABLE IF EXISTS participant_position_projection;
DROP TABLE IF EXISTS cycle_projection;

CREATE TABLE cycle_projection (
  kernel_address VARCHAR(42) NOT NULL,
  token_address VARCHAR(42) NOT NULL,
  cycle_id VARCHAR(66) NOT NULL,
  chain_id INT NOT NULL,
  snapshot_commitment VARCHAR(66) NOT NULL,
  gross_obligation_total NUMERIC NOT NULL,
  net_debt_total NUMERIC NOT NULL,
  total_funded NUMERIC NOT NULL DEFAULT 0,
  total_distributed NUMERIC NOT NULL DEFAULT 0,
  total_refunded NUMERIC NOT NULL DEFAULT 0,
  funding_deadline BIGINT NOT NULL,
  state VARCHAR(30) NOT NULL,
  creator VARCHAR(42) NOT NULL,
  last_updated_block BIGINT NOT NULL,
  last_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (kernel_address, cycle_id)
);

CREATE TABLE participant_position_projection (
  kernel_address VARCHAR(42) NOT NULL,
  cycle_id VARCHAR(66) NOT NULL,
  participant_address VARCHAR(42) NOT NULL,
  position_type VARCHAR(10) NOT NULL CHECK (position_type IN ('debtor', 'creditor')),
  required_amount NUMERIC NOT NULL,
  funded_amount NUMERIC NOT NULL DEFAULT 0,
  distributed_amount NUMERIC NOT NULL DEFAULT 0,
  refunded_amount NUMERIC NOT NULL DEFAULT 0,
  is_fully_funded BOOLEAN NOT NULL DEFAULT FALSE,
  last_updated_block BIGINT NOT NULL,
  PRIMARY KEY (kernel_address, cycle_id, participant_address),
  FOREIGN KEY (kernel_address, cycle_id) REFERENCES cycle_projection(kernel_address, cycle_id) ON DELETE CASCADE
);

CREATE INDEX idx_participant_proj_addr ON participant_position_projection(participant_address);

ALTER TABLE cycle_projection ENABLE ROW LEVEL SECURITY;
ALTER TABLE participant_position_projection ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read cycle_projection" ON cycle_projection FOR SELECT USING (true);
CREATE POLICY "Public read participant_position_projection" ON participant_position_projection FOR SELECT USING (true);

CREATE POLICY "Service role manages cycle_projection" ON cycle_projection
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role manages participant_position_projection" ON participant_position_projection
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Force a replay so the rebuilt projections are repopulated from chain.
DELETE FROM indexer_cursor;

COMMIT;
