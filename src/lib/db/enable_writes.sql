-- ============================================================================
-- Netteo: Public Insert & Update RLS Policies + Genesis Seed
-- Run this in your Supabase SQL Editor to allow browser clients to create/update
-- groups, group members, obligations, and settlement cycles.
-- ============================================================================

-- Groups & Members
CREATE POLICY "Public insert groups" ON groups 
  FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Public update groups" ON groups 
  FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Public insert group_members" ON group_members 
  FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Public update group_members" ON group_members 
  FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

-- Obligations
CREATE POLICY "Public insert obligations" ON obligations 
  FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Public update obligations" ON obligations 
  FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

-- Cycles
CREATE POLICY "Public insert cycles" ON cycles 
  FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Public update cycles" ON cycles 
  FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Public insert cycle_obligations" ON cycle_obligations 
  FOR INSERT TO anon, authenticated WITH CHECK (true);

-- Consumed Nonces (Replay Protection)
CREATE TABLE IF NOT EXISTS consumed_nonces (
  nonce VARCHAR(128) PRIMARY KEY,
  challenge_timestamp BIGINT NOT NULL,
  consumed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE consumed_nonces ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public insert consumed_nonces" ON consumed_nonces 
  FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Public select consumed_nonces" ON consumed_nonces 
  FOR SELECT TO anon, authenticated USING (true);

-- Genesis Seed Group
INSERT INTO groups (id, name, description, creator_address)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Genesis Design & Infra Collective',
  'Shared design, infrastructure, and API reimbursement working group.',
  '0x1111111111111111111111111111111111111111'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO group_members (group_id, wallet_address, role)
VALUES
  ('00000000-0000-0000-0000-000000000001', '0x1111111111111111111111111111111111111111', 'admin'),
  ('00000000-0000-0000-0000-000000000001', '0x2222222222222222222222222222222222222222', 'member'),
  ('00000000-0000-0000-0000-000000000001', '0x3333333333333333333333333333333333333333', 'member')
ON CONFLICT (group_id, wallet_address) DO NOTHING;

-- Genesis Canonical Obligations
INSERT INTO obligations (id, group_id, proposer_address, debtor_address, creditor_address, amount_units, reference_label, status)
VALUES
  (
    '00000000-0000-0000-0000-000000000011',
    '00000000-0000-0000-0000-000000000001',
    '0x1111111111111111111111111111111111111111',
    '0x1111111111111111111111111111111111111111',
    '0x2222222222222222222222222222222222222222',
    100000000000000000000,
    'Design sprint deliverables (Invoice #104)',
    'accepted'
  ),
  (
    '00000000-0000-0000-0000-000000000012',
    '00000000-0000-0000-0000-000000000001',
    '0x2222222222222222222222222222222222222222',
    '0x2222222222222222222222222222222222222222',
    '0x3333333333333333333333333333333333333333',
    80000000000000000000,
    'RPC infrastructure node maintenance',
    'accepted'
  ),
  (
    '00000000-0000-0000-0000-000000000013',
    '00000000-0000-0000-0000-000000000001',
    '0x3333333333333333333333333333333333333333',
    '0x3333333333333333333333333333333333333333',
    '0x1111111111111111111111111111111111111111',
    20000000000000000000,
    'Shared API subscription reimbursement',
    'accepted'
  )
ON CONFLICT (id) DO NOTHING;
