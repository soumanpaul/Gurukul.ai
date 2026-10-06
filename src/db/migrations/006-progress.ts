import type { Migration } from '../types.ts';
export const progressMigration: Migration = { version: 6, async apply(database) {
  await database.execAsync(`
    CREATE TABLE progress_flags (
      attempt_id TEXT NOT NULL REFERENCES attempts(id), item_id TEXT NOT NULL REFERENCES quiz_items(id),
      flagged INTEGER NOT NULL CHECK(flagged IN (0,1)), updated_at TEXT NOT NULL,
      PRIMARY KEY(attempt_id,item_id)
    );
    CREATE TABLE quiz_repeats (
      quiz_id TEXT PRIMARY KEY NOT NULL REFERENCES quizzes(id), parent_quiz_id TEXT NOT NULL REFERENCES quizzes(id)
    );
    CREATE INDEX attempts_completion ON attempts(status,submitted_at,id);
  `);
} };
