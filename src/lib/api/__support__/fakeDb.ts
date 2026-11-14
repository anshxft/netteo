/**
 * Minimal in-memory stand-in for the Supabase query builder, covering exactly what src/lib/api uses.
 * Test support only: nothing in the app imports it.
 */
type Row = Record<string, any>;

const PRIMARY_KEYS: Record<string, string[]> = {
  consumed_nonces: ['nonce'],
  cycles: ['cycle_id'],
  group_members: ['group_id', 'wallet_address'],
  groups: ['id'],
  obligations: ['id'],
  cycle_obligations: ['cycle_id', 'obligation_id'],
};

/** Parses PostgREST "or" strings such as "a.eq.x,b.in.(1,2)" into row predicates. */
function parseOr(expression: string): (row: Row) => boolean {
  const conditions = [...expression.matchAll(/([a-z_]+)\.(eq|in)\.(\([^)]*\)|[^,]+)/g)].map(([, column, op, value]) => {
    if (op === 'eq') return (row: Row) => String(row[column]) === value;
    const set = new Set(value.slice(1, -1).split(','));
    return (row: Row) => set.has(String(row[column]));
  });
  return (row) => conditions.some((test) => test(row));
}

class Query implements PromiseLike<any> {
  private op: 'select' | 'insert' | 'update' | 'delete' | 'upsert' = 'select';
  private filters: Array<(row: Row) => boolean> = [];
  private payload: any;
  private returning = false;
  private mode: null | 'single' | 'maybe' = null;
  private head = false;
  private orderColumn?: { column: string; ascending: boolean };
  private max?: number;
  private conflict?: string[];

  constructor(private db: FakeDb, private table: string) {}

  select(_columns?: string, options?: { head?: boolean; count?: string }) {
    if (this.op !== 'select') this.returning = true;
    if (options?.head) this.head = true;
    return this;
  }
  insert(payload: Row | Row[]) { this.op = 'insert'; this.payload = payload; return this; }
  update(payload: Row) { this.op = 'update'; this.payload = payload; return this; }
  upsert(payload: Row | Row[], options?: { onConflict?: string }) {
    this.op = 'upsert';
    this.payload = payload;
    this.conflict = options?.onConflict?.split(',');
    return this;
  }
  delete() { this.op = 'delete'; return this; }
  eq(column: string, value: any) { this.filters.push((row) => row[column] === value); return this; }
  in(column: string, values: any[]) { this.filters.push((row) => values.includes(row[column])); return this; }
  lt(column: string, value: number) { this.filters.push((row) => row[column] < value); return this; }
  or(expression: string) { this.filters.push(parseOr(expression)); return this; }
  order(column: string, options?: { ascending?: boolean }) { this.orderColumn = { column, ascending: options?.ascending !== false }; return this; }
  limit(n: number) { this.max = n; return this; }
  single() { this.mode = 'single'; return this; }
  maybeSingle() { this.mode = 'maybe'; return this; }

  then<T1 = any, T2 = never>(onFulfilled?: (value: any) => T1 | PromiseLike<T1>, onRejected?: (reason: any) => T2 | PromiseLike<T2>) {
    return Promise.resolve(this.exec()).then(onFulfilled, onRejected);
  }

  private rows(): Row[] {
    return (this.db.tables[this.table] ||= []);
  }

  private shape(rows: Row[]) {
    if (this.mode === 'single') {
      return rows.length === 1 ? { data: rows[0], error: null } : { data: null, error: { message: 'Row count != 1', code: 'PGRST116' } };
    }
    if (this.mode === 'maybe') return { data: rows[0] ?? null, error: null };
    return { data: rows, error: null };
  }

  private exec(): any {
    const table = this.rows();
    const matches = () => table.filter((row) => this.filters.every((test) => test(row)));
    const keys = PRIMARY_KEYS[this.table] || [];

    switch (this.op) {
      case 'select': {
        if (this.db.failing.has(this.table)) return { data: null, count: null, error: { message: 'connection refused' } };
        let rows = matches();
        if (this.orderColumn) {
          const { column, ascending } = this.orderColumn;
          rows = [...rows].sort((a, b) => (a[column] > b[column] ? 1 : a[column] < b[column] ? -1 : 0) * (ascending ? 1 : -1));
        }
        if (this.max !== undefined) rows = rows.slice(0, this.max);
        if (this.head) return { data: null, count: rows.length, error: null };
        return this.shape(rows);
      }
      case 'insert': {
        const incoming: Row[] = (Array.isArray(this.payload) ? this.payload : [this.payload]).map((row: Row) => ({
          ...(keys.includes('id') && !row.id ? { id: crypto.randomUUID() } : {}),
          created_at: new Date().toISOString(),
          ...row,
        }));
        for (const row of incoming) {
          if (keys.length && table.some((existing) => keys.every((k) => existing[k] === row[k]))) {
            return { data: null, error: { code: '23505', message: 'duplicate key value violates unique constraint' } };
          }
        }
        table.push(...incoming);
        return this.returning ? this.shape(incoming) : { data: null, error: null };
      }
      case 'upsert': {
        const conflict = this.conflict || keys;
        const incoming = Array.isArray(this.payload) ? this.payload : [this.payload];
        for (const row of incoming) {
          const existing = table.find((e) => conflict.every((k) => e[k] === row[k]));
          if (existing) Object.assign(existing, row);
          else table.push({ ...row });
        }
        return { data: null, error: null };
      }
      case 'update': {
        const rows = matches();
        this.db.beforeUpdate?.(this.table, rows);
        // Re-evaluate after the hook: a concurrent change must make a status-guarded update match nothing.
        const live = table.filter((row) => this.filters.every((test) => test(row)));
        for (const row of live) Object.assign(row, this.payload);
        return this.returning ? this.shape(live) : { data: null, error: null };
      }
      case 'delete': {
        const doomed = new Set(matches());
        this.db.tables[this.table] = table.filter((row) => !doomed.has(row));
        return { data: null, error: null };
      }
    }
  }
}

export class FakeDb {
  tables: Record<string, Row[]> = {};
  /** Tables whose reads fail, to simulate a database outage. */
  failing = new Set<string>();
  /** Lets a test change data between an API's read and its write, to prove updates are atomic. */
  beforeUpdate?: (table: string, rows: Row[]) => void;

  constructor(seed: Record<string, Row[]> = {}) {
    for (const [name, rows] of Object.entries(seed)) this.tables[name] = rows.map((row) => ({ ...row }));
  }

  from(table: string) {
    return new Query(this, table);
  }

  rows(table: string): Row[] {
    return this.tables[table] || [];
  }
}
