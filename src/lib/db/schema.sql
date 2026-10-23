-- ============================================================================
-- Netteo Postgres Database Schema & Row-Level Security (RLS)
-- Conforms to architecture.md §8 & §9, and Secure_Vibe_Coding.pdf
-- ============================================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ----------------------------------------------------------------------------
-- 1. Groups & Participants (Off-Chain Coordination)
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  creator_address VARCHAR(42) NOT NULL, -- lowercase checksum-safe 0x hex
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS group_members (
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  wallet_address VARCHAR(42) NOT NULL, -- lowercase checksum-safe 0x hex
  role VARCHAR(20) NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (group_id, wallet_address)
);

CREATE INDEX IF NOT EXISTS idx_group_members_wallet ON group_members(wallet_address);

-- ----------------------------------------------------------------------------
-- 2. Obligations (Gross Financial Claims)
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS obligations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  proposer_address VARCHAR(42) NOT NULL,
  debtor_address VARCHAR(42) NOT NULL,
  creditor_address VARCHAR(42) NOT NULL,
  amount_units NUMERIC NOT NULL CHECK (amount_units > 0), -- Base integer units (e.g. 18 decimals)
  reference_label VARCHAR(150) NOT NULL,
  due_at TIMESTAMPTZ,
  status VARCHAR(20) NOT NULL DEFAULT 'proposed' CHECK (status IN ('proposed', 'accepted', 'disputed', 'withdrawn', 'frozen', 'settled')),
  document_reference TEXT, -- Private pointer, never public URL
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_debtor_creditor_diff CHECK (debtor_address <> creditor_address)
);

CREATE INDEX IF NOT EXISTS idx_obligations_group ON obligations(group_id);
CREATE INDEX IF NOT EXISTS idx_obligations_debtor ON obligations(debtor_address);
CREATE INDEX IF NOT EXISTS idx_obligations_creditor ON obligations(creditor_address);
CREATE INDEX IF NOT EXISTS idx_obligations_status ON obligations(status);

-- ----------------------------------------------------------------------------
-- 3. Settlement Cycles (Freeze & Netting Snapshot Metadata)
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS cycles (
  cycle_id VARCHAR(66) PRIMARY KEY, -- 0x-prefixed 32-byte hex
  group_id UUID NOT NULL REFERENCES groups(id),
  snapshot_commitment VARCHAR(66) NOT NULL, -- keccak256 hash of canonical snapshot
  algorithm_version VARCHAR(20) NOT NULL DEFAULT '1.0.0',
  participant_count INT NOT NULL CHECK (participant_count > 0 AND participant_count <= 10),
  obligation_count INT NOT NULL CHECK (obligation_count > 0),
  gross_obligation_total NUMERIC NOT NULL,
  net_debtor_total NUMERIC NOT NULL,
  funding_deadline TIMESTAMPTZ NOT NULL,
  state VARCHAR(30) NOT NULL DEFAULT 'Funding' CHECK (state IN ('Funding', 'ReadyToSettle', 'Completed', 'Expired', 'Refunded')),
  creator_address VARCHAR(42) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  funded_at TIMESTAMPTZ,
  settled_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_cycles_group ON cycles(group_id);
CREATE INDEX IF NOT EXISTS idx_cycles_state ON cycles(state);

CREATE TABLE IF NOT EXISTS cycle_obligations (
  cycle_id VARCHAR(66) NOT NULL REFERENCES cycles(cycle_id) ON DELETE CASCADE,
  obligation_id UUID NOT NULL REFERENCES obligations(id),
  PRIMARY KEY (cycle_id, obligation_id)
);

-- ----------------------------------------------------------------------------
-- 4. On-Chain Event Ingestion & Indexer Projections (architecture.md §8)
-- ----------------------------------------------------------------------------

-- Canonical event log records (Append-only & strictly idempotent)
CREATE TABLE IF NOT EXISTS indexed_events (
  id BIGSERIAL PRIMARY KEY,
  chain_id INT NOT NULL,
  contract_address VARCHAR(42) NOT NULL,
  block_number BIGINT NOT NULL,
  transaction_hash VARCHAR(66) NOT NULL,
  log_index INT NOT NULL,
  event_name VARCHAR(50) NOT NULL,
  event_data JSONB NOT NULL,
  indexed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_indexed_event UNIQUE (chain_id, transaction_hash, log_index)
);

CREATE INDEX IF NOT EXISTS idx_indexed_events_block ON indexed_events(chain_id, block_number);
CREATE INDEX IF NOT EXISTS idx_indexed_events_name ON indexed_events(event_name);

-- Read-optimized cycle projection
CREATE TABLE IF NOT EXISTS cycle_projection (
  cycle_id VARCHAR(66) PRIMARY KEY,
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
  last_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Read-optimized participant position projection
CREATE TABLE IF NOT EXISTS participant_position_projection (
  cycle_id VARCHAR(66) NOT NULL REFERENCES cycle_projection(cycle_id) ON DELETE CASCADE,
  participant_address VARCHAR(42) NOT NULL,
  position_type VARCHAR(10) NOT NULL CHECK (position_type IN ('debtor', 'creditor')),
  required_amount NUMERIC NOT NULL,
  funded_amount NUMERIC NOT NULL DEFAULT 0,
  distributed_amount NUMERIC NOT NULL DEFAULT 0,
  refunded_amount NUMERIC NOT NULL DEFAULT 0,
  is_fully_funded BOOLEAN NOT NULL DEFAULT FALSE,
  last_updated_block BIGINT NOT NULL,
  PRIMARY KEY (cycle_id, participant_address)
);

CREATE INDEX IF NOT EXISTS idx_participant_proj_addr ON participant_position_projection(participant_address);

-- Indexer block cursor
CREATE TABLE IF NOT EXISTS indexer_cursor (
  id VARCHAR(50) PRIMARY KEY, -- e.g. 'mezo_testnet_settlement_kernel'
  chain_id INT NOT NULL,
  contract_address VARCHAR(42) NOT NULL,
  last_processed_block BIGINT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 5. Row Level Security (RLS) Policies
-- ----------------------------------------------------------------------------

ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE obligations ENABLE ROW LEVEL SECURITY;
ALTER TABLE cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE cycle_obligations ENABLE ROW LEVEL SECURITY;
ALTER TABLE indexed_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE cycle_projection ENABLE ROW LEVEL SECURITY;
ALTER TABLE participant_position_projection ENABLE ROW LEVEL SECURITY;
ALTER TABLE indexer_cursor ENABLE ROW LEVEL SECURITY;

-- Read policies for public queries
CREATE POLICY "Public read groups" ON groups FOR SELECT USING (true);
CREATE POLICY "Public read group_members" ON group_members FOR SELECT USING (true);
CREATE POLICY "Public read obligations" ON obligations FOR SELECT USING (true);
CREATE POLICY "Public read cycles" ON cycles FOR SELECT USING (true);
CREATE POLICY "Public read cycle_obligations" ON cycle_obligations FOR SELECT USING (true);
CREATE POLICY "Public read cycle_projection" ON cycle_projection FOR SELECT USING (true);
CREATE POLICY "Public read participant_position_projection" ON participant_position_projection FOR SELECT USING (true);

-- Indexer tables writeable only by service_role
CREATE POLICY "Service role manages indexed_events" ON indexed_events
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role manages cycle_projection" ON cycle_projection
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role manages participant_position_projection" ON participant_position_projection
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role manages indexer_cursor" ON indexer_cursor
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Insert & Update policies for public coordination
CREATE POLICY "Public insert groups" ON groups 
  FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Public update groups" ON groups 
  FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Public insert group_members" ON group_members 
  FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Public update group_members" ON group_members 
  FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Public insert obligations" ON obligations 
  FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Public update obligations" ON obligations 
  FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Public insert cycles" ON cycles 
  FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Public update cycles" ON cycles 
  FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Public insert cycle_obligations" ON cycle_obligations 
  FOR INSERT TO anon, authenticated WITH CHECK (true);

-- ----------------------------------------------------------------------------
-- 6. Consumed Nonces (Serverless Replay Protection across Lambdas)
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS consumed_nonces (
  nonce VARCHAR(128) PRIMARY KEY,
  challenge_timestamp BIGINT NOT NULL,
  consumed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_consumed_nonces_timestamp ON consumed_nonces(challenge_timestamp);

ALTER TABLE consumed_nonces ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages consumed_nonces" ON consumed_nonces
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Public insert consumed_nonces" ON consumed_nonces 
  FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Public select consumed_nonces" ON consumed_nonces 
  FOR SELECT TO anon, authenticated USING (true);

