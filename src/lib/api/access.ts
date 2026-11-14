import type { Db } from './types';

/** The chain could not be read (RPC down or rate-limited). Routes turn this into a 502 with a retry message. */
export class ChainUnavailableError extends Error {
  constructor() {
    super('Chain unavailable');
    this.name = 'ChainUnavailableError';
  }
}

/** The database could not be read. Routes turn this into a 503, never into an empty result. */
export class DatabaseUnavailableError extends Error {
  constructor() {
    super('Database unavailable');
    this.name = 'DatabaseUnavailableError';
  }
}

/** Group ids a wallet created or belongs to. Every private read is limited to these. */
export async function groupIdsForWallet(db: Db, wallet: string): Promise<string[]> {
  const [members, created] = await Promise.all([
    db.from('group_members').select('group_id').eq('wallet_address', wallet),
    db.from('groups').select('id').eq('creator_address', wallet),
  ]);
  // A failed read must never look like "you belong to no groups": callers would show (and cache) an empty ledger.
  if (members.error || created.error) throw new DatabaseUnavailableError();
  const ids = new Set<string>();
  for (const row of members.data || []) ids.add(row.group_id);
  for (const row of created.data || []) ids.add(row.id);
  return [...ids];
}

export interface GroupAccess {
  exists: boolean;
  creator: string;
  /** Lowercase addresses of everyone in the group, creator included. */
  members: Set<string>;
  isMember: boolean;
  isAdmin: boolean;
}

export async function groupAccess(db: Db, groupId: string, wallet: string): Promise<GroupAccess> {
  const [group, members] = await Promise.all([
    db.from('groups').select('creator_address').eq('id', groupId).maybeSingle(),
    db.from('group_members').select('wallet_address, role').eq('group_id', groupId),
  ]);

  if (group.error || members.error) throw new DatabaseUnavailableError();
  if (!group.data) {
    return { exists: false, creator: '', members: new Set(), isMember: false, isAdmin: false };
  }

  const creator = String(group.data.creator_address).toLowerCase();
  const set = new Set<string>([creator]);
  let adminRow = false;
  for (const row of members.data || []) {
    const addr = String(row.wallet_address).toLowerCase();
    set.add(addr);
    if (addr === wallet && row.role === 'admin') adminRow = true;
  }

  return {
    exists: true,
    creator,
    members: set,
    isMember: set.has(wallet),
    isAdmin: wallet === creator || adminRow,
  };
}
