// A stand-in for Cloudflare D1 in tests: the same calls the Worker makes
// (prepare, bind, run, all, first, batch), running on Node's built-in SQLite.
import { DatabaseSync } from 'node:sqlite';

export function fakeD1() {
  const sqlite = new DatabaseSync(':memory:');
  const exec = (sql, params) => {
    const stmt = sqlite.prepare(sql);
    if (/^\s*(SELECT|WITH)\b/i.test(sql)) return { success: true, results: stmt.all(...params).map((row) => ({ ...row })), meta: {} };
    const { changes } = stmt.run(...params);
    return { success: true, results: [], meta: { changes } };
  };
  const statement = (sql, params = []) => ({
    bind: (...values) => statement(sql, values),
    run: async () => exec(sql, params),
    all: async () => exec(sql, params),
    first: async () => exec(sql, params).results[0] ?? null,
    exec: () => exec(sql, params),
  });
  return {
    sqlite,
    prepare: (sql) => statement(sql),
    // D1 runs a batch as one transaction.
    batch: async (statements) => {
      sqlite.exec('BEGIN');
      try {
        const results = statements.map((s) => s.exec());
        sqlite.exec('COMMIT');
        return results;
      } catch (err) {
        sqlite.exec('ROLLBACK');
        throw err;
      }
    },
  };
}
