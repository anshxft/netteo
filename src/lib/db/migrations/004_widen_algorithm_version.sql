-- 004_widen_algorithm_version.sql
-- cycles.algorithm_version was VARCHAR(20), but the netting code writes 'netteo-v1.0-deterministic' (25 chars),
-- so every cycle registration failed with "value too long" and was reported as a 500.
-- Fresh installs do NOT need this file: schema.sql already has the final shape. Safe to run more than once.
ALTER TABLE cycles ALTER COLUMN algorithm_version TYPE VARCHAR(64);
