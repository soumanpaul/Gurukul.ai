import type { Migration } from '../types.ts';

export const cleanupMigration: Migration = { version: 7, async apply(database) {
  await database.execAsync(`CREATE TABLE file_cleanup (
    filename TEXT PRIMARY KEY NOT NULL, attempts INTEGER NOT NULL DEFAULT 0,
    error_code TEXT, created_at TEXT NOT NULL
  );`);
} };
