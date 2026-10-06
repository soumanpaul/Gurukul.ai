import type { Database, Migration } from './types.ts';
import { foundationMigration } from './migrations/001-foundation.ts';
import { modelMigration } from './migrations/002-model-installations.ts';
import { importsMigration } from './migrations/003-imports.ts';
import { studyMigration } from './migrations/004-study.ts';
import { quizMigration } from './migrations/005-quizzes.ts';
import { progressMigration } from './migrations/006-progress.ts';
import { cleanupMigration } from './migrations/007-cleanup.ts';
import { localSessionMigration } from './migrations/008-local-session.ts';
import { buddyMigration } from './migrations/009-buddy.ts';
import { profileAvatarMigration } from './migrations/010-profile-avatar.ts';

export class DatabaseVersionError extends Error {}

export async function migrate(database: Database, migrations: readonly Migration[] = [foundationMigration, modelMigration, importsMigration, studyMigration, quizMigration, progressMigration, cleanupMigration, localSessionMigration, buddyMigration, profileAvatarMigration]) {
  if (migrations.some((migration, index) => migration.version !== index + 1)) {
    throw new DatabaseVersionError('Migration versions must be contiguous.');
  }
  await database.execAsync('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;');
  await database.withExclusiveTransactionAsync(async transaction => {
    await transaction.execAsync(`CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY NOT NULL, applied_at TEXT NOT NULL
    );`);
    const applied = await transaction.getAllAsync<{ version: number }>('SELECT version FROM schema_migrations ORDER BY version');
    if (applied.length > migrations.length || applied.some((row, index) => row.version !== index + 1)) {
      throw new DatabaseVersionError('This database needs a compatible app version. No data was reset.');
    }
    for (const migration of migrations.slice(applied.length)) {
      await migration.apply(transaction);
      await transaction.runAsync('INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)',
        migration.version, new Date().toISOString());
    }
  });
}
