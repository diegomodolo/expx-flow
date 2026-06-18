// ============================================================
// mockSupabase.ts — Stub de Supabase client para Deno.test
// ------------------------------------------------------------
// Permite testar helpers e migrações de credencial sem rede.
// Uso:
//   const mock = mockSupabase({
//     system_config_facebook: { app_id: "X", app_secret: null, ... }
//   });
//   const cfg = await getSystemConfig(mock, "facebook");
//   assertEquals(cfg?.app_id, "X");
//
// Suporta: select, insert, update, delete, eq, maybeSingle, single.
// Cada chamada mutante (insert/update/delete) atualiza o seed.
// ============================================================

export type SupabaseSeed = Record<string, Record<string, unknown> | null>;

interface ChainOptions {
  table?: string;
  filterCol?: string;
  filterVal?: unknown;
  selectCols?: string;
}

function pickFields<T extends Record<string, unknown>>(
  row: T,
  cols: string,
): T | Partial<T> {
  if (!cols || cols === "*") return row;
  const fields = cols.split(",").map((c) => c.trim());
  const out: Record<string, unknown> = {};
  for (const f of fields) {
    if (f in row) out[f] = row[f];
  }
  return out as T;
}

export interface MockSupabaseClient {
  from: (table: string) => MockQueryBuilder;
  __seed: SupabaseSeed;
  __mutations: Array<{ op: string; table: string; payload: unknown }>;
}

export interface MockQueryBuilder {
  select: (cols?: string) => MockQueryBuilder & { __cols: string };
  insert: (payload: Record<string, unknown>) => MockExecutable;
  update: (payload: Record<string, unknown>) => MockQueryBuilder;
  delete: () => MockQueryBuilder;
  eq: (col: string, val: unknown) => MockQueryBuilder;
  maybeSingle: () => Promise<{
    data: Record<string, unknown> | null;
    error: null;
  }>;
  single: () => Promise<{ data: Record<string, unknown> | null; error: null }>;
}

export interface MockExecutable {
  select: (cols?: string) => MockQueryBuilder;
  eq: (col: string, val: unknown) => MockQueryBuilder;
  maybeSingle: () => Promise<{
    data: Record<string, unknown> | null;
    error: null;
  }>;
  single: () => Promise<{ data: Record<string, unknown> | null; error: null }>;
  then: <T>(onFulfilled: (v: unknown) => T) => Promise<T>;
}

export function mockSupabase(seed: SupabaseSeed = {}): MockSupabaseClient {
  const state: SupabaseSeed = JSON.parse(JSON.stringify(seed));
  const mutations: Array<{ op: string; table: string; payload: unknown }> = [];

  function makeChain(table: string, opts: ChainOptions = {}): MockQueryBuilder {
    const chain = {
      select(cols: string = "*") {
        return makeChain(table, { ...opts, selectCols: cols });
      },
      insert(payload: Record<string, unknown>) {
        mutations.push({ op: "insert", table, payload });
        if (state[table] === undefined) state[table] = null;
        state[table] = { ...(state[table] || {}), ...payload };
        return makeExecutable(table, { ...opts });
      },
      update(payload: Record<string, unknown>) {
        mutations.push({ op: "update", table, payload });
        if (state[table]) {
          state[table] = { ...state[table], ...payload };
        }
        return makeChain(table, opts);
      },
      delete() {
        mutations.push({ op: "delete", table, payload: null });
        state[table] = null;
        return makeChain(table, opts);
      },
      eq(col: string, val: unknown) {
        return makeChain(table, { ...opts, filterCol: col, filterVal: val });
      },
      async maybeSingle() {
        const row = state[table];
        if (!row) return { data: null, error: null };
        if (
          opts.filterCol &&
          opts.filterVal !== undefined &&
          row[opts.filterCol] !== opts.filterVal
        ) {
          return { data: null, error: null };
        }
        return { data: pickFields(row, opts.selectCols || "*"), error: null };
      },
      async single() {
        const r = await this.maybeSingle();
        return r;
      },
    };
    return chain as MockQueryBuilder;
  }

  function makeExecutable(
    table: string,
    opts: ChainOptions = {},
  ): MockExecutable {
    return {
      select(cols: string = "*") {
        return makeChain(table, { ...opts, selectCols: cols });
      },
      eq(col: string, val: unknown) {
        return makeChain(table, { ...opts, filterCol: col, filterVal: val });
      },
      async maybeSingle() {
        const row = state[table];
        if (!row) return { data: null, error: null };
        if (
          opts.filterCol &&
          opts.filterVal !== undefined &&
          row[opts.filterCol] !== opts.filterVal
        ) {
          return { data: null, error: null };
        }
        return { data: pickFields(row, opts.selectCols || "*"), error: null };
      },
      async single() {
        const r = await this.maybeSingle();
        return r;
      },
      then<T>(onFulfilled: (v: unknown) => T) {
        return this.maybeSingle().then(onFulfilled);
      },
    };
  }

  return {
    from(table: string) {
      return makeChain(table, {});
    },
    __seed: state,
    __mutations: mutations,
  };
}
