import type { SupabaseClient } from "@supabase/supabase-js";

// An in-memory stand-in for the parts of supabase-js the finance server
// code uses, with Row Level Security simulated the way the migration
// defines it: a client only ever sees, updates or deletes rows whose
// user_id is its own user, and cannot insert rows for anyone else.
//
// This tests that the APPLICATION never relies on seeing another user's
// rows and behaves correctly when RLS hides them. It does not replace
// running the policies against a real Postgres.

type Row = Record<string, unknown>;
type Filter = (row: Row) => boolean;

export type FakeDatabase = {
  tables: Map<string, Row[]>;
  storage: Map<string, { owner: string; bytes: Uint8Array }>;
};

export function createFakeDatabase(): FakeDatabase {
  return { tables: new Map(), storage: new Map() };
}

const UNIQUE_KEYS: Readonly<Record<string, ReadonlyArray<ReadonlyArray<string>>>> = {
  finance_accounts: [["user_id", "bank", "account_identifier", "currency", "product"]],
  finance_categories: [["user_id", "slug"]],
  finance_statement_imports: [["user_id", "file_sha256"]],
  finance_statements: [["import_id", "section_index"]],
  finance_transactions: [["user_id", "account_id", "fingerprint", "occurrence"]],
};

let idCounter = 0;
const newId = () => {
  idCounter += 1;
  return `00000000-0000-4000-8000-${String(idCounter).padStart(12, "0")}`;
};

class Query implements PromiseLike<{ data: unknown; error: { message: string; code?: string } | null }> {
  private filters: Filter[] = [];
  private operation: "select" | "insert" | "update" | "delete" | "upsert" = "select";
  private payload: Row[] = [];
  private patch: Row = {};
  private returning = false;
  private singleMode: "one" | "maybe" | null = null;
  private upsertOptions: { onConflict?: string; ignoreDuplicates?: boolean } = {};
  private rangeFrom = 0;
  private rangeTo = Number.MAX_SAFE_INTEGER;

  constructor(
    private readonly database: FakeDatabase,
    private readonly table: string,
    private readonly userId: string | null,
  ) {}

  private rows(): Row[] {
    if (!this.database.tables.has(this.table)) this.database.tables.set(this.table, []);
    return this.database.tables.get(this.table)!;
  }

  // RLS: own rows only.
  private visible(row: Row): boolean {
    return this.userId !== null && row.user_id === this.userId;
  }

  select(): this {
    if (this.operation === "select") this.operation = "select";
    else this.returning = true;
    return this;
  }
  insert(rows: Row | Row[]): this {
    this.operation = "insert";
    this.payload = Array.isArray(rows) ? rows : [rows];
    return this;
  }
  upsert(rows: Row | Row[], options: { onConflict?: string; ignoreDuplicates?: boolean } = {}): this {
    this.operation = "upsert";
    this.payload = Array.isArray(rows) ? rows : [rows];
    this.upsertOptions = options;
    return this;
  }
  update(patch: Row): this {
    this.operation = "update";
    this.patch = patch;
    return this;
  }
  delete(): this {
    this.operation = "delete";
    return this;
  }
  eq(column: string, value: unknown): this {
    this.filters.push((row) => row[column] === value);
    return this;
  }
  is(column: string, value: null): this {
    this.filters.push((row) => (row[column] ?? null) === value);
    return this;
  }
  not(column: string, operator: string, value: unknown): this {
    this.filters.push((row) => !(operator === "is" ? (row[column] ?? null) === value : row[column] === value));
    return this;
  }
  in(column: string, values: unknown[]): this {
    this.filters.push((row) => values.includes(row[column]));
    return this;
  }
  gte(column: string, value: string): this {
    this.filters.push((row) => String(row[column]) >= value);
    return this;
  }
  lte(column: string, value: string): this {
    this.filters.push((row) => String(row[column]) <= value);
    return this;
  }
  order(): this {
    return this;
  }
  limit(): this {
    return this;
  }
  range(from: number, to: number): this {
    this.rangeFrom = from;
    this.rangeTo = to;
    return this;
  }
  maybeSingle(): this {
    this.singleMode = "maybe";
    return this;
  }
  single(): this {
    this.singleMode = "one";
    return this;
  }

  private conflictKey(row: Row, columns: ReadonlyArray<string>): string {
    return columns.map((column) => JSON.stringify(row[column] ?? null)).join("|");
  }

  private findConflict(row: Row, explicit?: string): Row | undefined {
    const keys = explicit ? [explicit.split(",")] : (UNIQUE_KEYS[this.table] ?? []);
    return this.rows().find((existing) => keys.some((columns) => this.conflictKey(existing, columns) === this.conflictKey(row, columns)));
  }

  private execute(): { data: unknown; error: { message: string; code?: string } | null } {
    const matches = () => this.rows().filter((row) => this.visible(row) && this.filters.every((filter) => filter(row)));
    let result: Row[];

    if (this.operation === "select") {
      result = matches().slice(this.rangeFrom, this.rangeTo + 1);
    } else if (this.operation === "insert" || this.operation === "upsert") {
      result = [];
      for (const input of this.payload) {
        if (input.user_id !== this.userId) return { data: null, error: { message: "new row violates row-level security policy", code: "42501" } };
        const conflict = this.findConflict(input, this.upsertOptions.onConflict);
        if (conflict) {
          if (this.operation === "insert") return { data: null, error: { message: "duplicate key value", code: "23505" } };
          if (this.upsertOptions.ignoreDuplicates) continue;
          Object.assign(conflict, input);
          result.push(conflict);
          continue;
        }
        const row = { id: newId(), created_at: new Date().toISOString(), ...input };
        this.rows().push(row);
        result.push(row);
      }
    } else if (this.operation === "update") {
      result = matches();
      for (const row of result) Object.assign(row, this.patch);
    } else {
      result = matches();
      this.database.tables.set(
        this.table,
        this.rows().filter((row) => !result.includes(row)),
      );
    }

    if (this.singleMode) {
      if (result.length === 0) return this.singleMode === "maybe" ? { data: null, error: null } : { data: null, error: { message: "no rows", code: "PGRST116" } };
      return { data: { ...result[0] }, error: null };
    }

    return { data: this.operation === "select" || this.returning ? result.map((row) => ({ ...row })) : null, error: null };
  }

  then<TResult1, TResult2 = never>(
    onfulfilled?: ((value: { data: unknown; error: { message: string; code?: string } | null }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    return Promise.resolve(this.execute()).then(onfulfilled, onrejected);
  }
}

export function createFakeClient(database: FakeDatabase, userId: string | null): SupabaseClient {
  const client = {
    from(table: string) {
      return new Query(database, table, userId);
    },
    auth: {
      async getUser() {
        return userId ? { data: { user: { id: userId } }, error: null } : { data: { user: null }, error: { message: "no session" } };
      },
    },
    storage: {
      from() {
        return {
          async upload(path: string, bytes: Uint8Array) {
            // Storage policy: the first folder must be the caller's id.
            if (!userId || path.split("/")[0] !== userId) return { data: null, error: { message: "unauthorized" } };
            database.storage.set(path, { owner: userId, bytes });
            return { data: { path }, error: null };
          },
          async remove(paths: string[]) {
            for (const path of paths) {
              if (database.storage.get(path)?.owner === userId) database.storage.delete(path);
            }
            return { data: null, error: null };
          },
        };
      },
    },
  };

  return client as unknown as SupabaseClient;
}
