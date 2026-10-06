import type { Migration } from '../types.ts';
import { syntheticNotebook } from '../../domain/fixtures.ts';

export const foundationMigration: Migration = {
  version: 1,
  async apply(transaction) {
    await transaction.execAsync(`
      CREATE TABLE profile (
        id TEXT PRIMARY KEY NOT NULL,
        singleton INTEGER NOT NULL UNIQUE CHECK (singleton = 1),
        display_name TEXT NOT NULL CHECK (length(trim(display_name)) BETWEEN 1 AND 60),
        preferred_language TEXT NOT NULL CHECK (preferred_language IN ('en', 'hi', 'bn')),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE notebooks (
        id TEXT PRIMARY KEY NOT NULL,
        title TEXT NOT NULL CHECK (length(trim(title)) BETWEEN 1 AND 120),
        created_at TEXT NOT NULL
      );
      CREATE INDEX notebooks_created_at ON notebooks(created_at);
    `);
    await transaction.runAsync('INSERT INTO notebooks (id, title, created_at) VALUES (?, ?, ?)',
      syntheticNotebook.id, syntheticNotebook.title, new Date().toISOString());
  },
};
