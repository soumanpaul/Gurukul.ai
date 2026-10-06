import type { Migration } from '../types.ts';

export const modelMigration: Migration = {
  version: 2,
  async apply(transaction) {
    await transaction.execAsync(`CREATE TABLE model_installations (
      id TEXT PRIMARY KEY NOT NULL, source_revision TEXT NOT NULL,
      sha256 TEXT NOT NULL, bytes INTEGER NOT NULL CHECK(bytes > 0),
      license_ref TEXT NOT NULL, runtime_version TEXT NOT NULL,
      filename TEXT, partial TEXT, received INTEGER NOT NULL CHECK(received >= 0),
      status TEXT NOT NULL CHECK(status IN ('absent','downloading','verifying','paused','failed','ready')),
      updated_at TEXT NOT NULL
    );`);
  },
};
