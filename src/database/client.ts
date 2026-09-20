import * as SQLite from "expo-sqlite";
import { schema } from "./schema";

// Bump this whenever a migration below adds/changes something.
// CREATE TABLE IF NOT EXISTS in schema.ts only helps devices that have
// never run before — it's a no-op against a table that already exists
// with fewer columns, so anything added to an existing table (like the
// product image columns) needs its own ALTER TABLE here, gated by
// PRAGMA user_version so it only runs once per device.
const CURRENT_SCHEMA_VERSION = 2;

let db: SQLite.SQLiteDatabase | null = null;

function runMigrations(database: SQLite.SQLiteDatabase) {
  const row = database.getFirstSync<{ user_version: number }>(
    "PRAGMA user_version",
  );
  let version = row?.user_version ?? 0;

  if (version < 1) {
    // Version 1 is the schema as originally shipped (schema.ts's
    // CREATE TABLE IF NOT EXISTS already covers a from-scratch install).
    version = 1;
  }

  if (version < 2) {
    // Adds product photo support and the Drive-sync pull cursor.
    // Wrapped column-by-column with try/catch since ALTER TABLE ADD
    // COLUMN has no "IF NOT EXISTS" in SQLite, and this must stay safe
    // to run against both a fresh v1 install and a from-scratch v2
    // install (where schema.ts's CREATE TABLE already included these
    // columns, so adding them again would error).
    const tryAddColumn = (table: string, def: string) => {
      try {
        database.execSync(`ALTER TABLE ${table} ADD COLUMN ${def}`);
      } catch {
        // Column already exists (fresh install via the current
        // schema.ts) — safe to ignore.
      }
    };
    tryAddColumn("products", "image_local_uri TEXT");
    tryAddColumn("products", "image_drive_id TEXT");
    tryAddColumn("sync_state", "last_downloaded_cursor TEXT");
    version = 2;
  }

  database.execSync(`PRAGMA user_version = ${version}`);
}

export const getDb = () => {
  if (!db) {
    db = SQLite.openDatabaseSync("shopstock.db");
    db.execSync(schema);
    runMigrations(db);
  }
  return db;
};

export const tx = <T>(fn: (d: SQLite.SQLiteDatabase) => T): T => {
  // expo-sqlite's withTransactionSync callback is typed () => void and its
  // return value is discarded — it does NOT propagate whatever `fn`
  // returns. Capture the result in a closure variable instead, or every
  // caller relying on tx()'s return value (createSale, createProduct,
  // movement, createExpense) silently gets `undefined` back after a
  // successful write.
  let result: T;
  getDb().withTransactionSync(() => {
    result = fn(getDb());
  });
  return result!;
};
export const q = <T = any>(sql: string, params: any[] = []): T[] =>
  getDb().getAllSync<T>(sql, params);
export const one = <T = any>(sql: string, params: any[] = []): T | undefined =>
  q<T>(sql, params)[0];
export const run = (sql: string, params: any[] = []) => (
  getDb().runSync(sql, params),
  true
);
