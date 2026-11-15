import type { SupabaseClient } from '@supabase/supabase-js';

export type Db = SupabaseClient;

export interface ApiResult {
  status: number;
  body: Record<string, unknown>;
}

/** `code` is an optional machine-readable reason (for example `wrong_state`); `error` stays the plain-language message. */
export const fail = (status: number, error: string, code?: string): ApiResult => ({ status, body: code ? { error, code } : { error } });
export const ok = (body: Record<string, unknown>, status = 200): ApiResult => ({ status, body });

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** A real, client-supplied id. The all-zero "nil-ish" ids are reserved for the old seed data and refused. */
export function isUsableUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_RE.test(value) && !value.startsWith('00000000-0000-0000');
}

export const MAX_AMOUNT_UNITS = 2n ** 128n;
export const MAX_PARTICIPANTS = 10;
export const MAX_OBLIGATIONS_PER_CYCLE = 30;

/**
 * Columns returned to the app. Amounts are cast to text on purpose: PostgREST sends NUMERIC as a JSON
 * number, and JSON numbers lose precision above 2^53 (~0.009 MUSD at 18 decimals), which would silently
 * change an amount. Text keeps every digit.
 */
export const OBLIGATION_COLUMNS =
  'id, group_id, proposer_address, debtor_address, creditor_address, amount_units::text, token_address, reference_label, due_at, status, document_reference, created_at, updated_at, accepted_at, disputed_at';
