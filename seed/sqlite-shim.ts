// Shim for node:sqlite that avoids vite-node transform issues.
// vite-node strips the "node:" prefix and fails to resolve "sqlite" because
// it's not in builtinModules (it's experimental). Using createRequire bypasses
// the Vite transform pipeline entirely — the require call happens at runtime
// in the fork/thread process where the module is available. Types are declared
// locally to avoid pulling @types/node v22 (peer-conflicts with vitest v2).
import { createRequire } from 'node:module';

const _require = createRequire(import.meta.url);

interface StatementLike {
  all(...params: unknown[]): unknown[];
  get(...params: unknown[]): unknown;
  run(...params: unknown[]): { changes: number; lastInsertRowid: number };
}

interface DatabaseSyncCtor {
  new (path: string, opts?: { readOnly?: boolean }): DatabaseSyncInstance;
}

interface DatabaseSyncInstance {
  prepare(sql: string): StatementLike;
  close(): void;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sqliteModule: any = _require('node:sqlite');

export const DatabaseSync: DatabaseSyncCtor = sqliteModule.DatabaseSync;
export type DatabaseSync = DatabaseSyncInstance;
