import type { Migration } from '../types.ts';
export const quizMigration: Migration = { version: 5, async apply(database) {
  await database.execAsync(`
    CREATE TABLE quizzes (id TEXT PRIMARY KEY NOT NULL, notebook_id TEXT NOT NULL REFERENCES notebooks(id),
      question_count INTEGER NOT NULL CHECK(question_count IN (3,5)), status TEXT NOT NULL CHECK(status IN ('generating','ready','failed','cancelled','interrupted')),
      evidence_json TEXT NOT NULL, model_version TEXT NOT NULL, prompt_version TEXT NOT NULL, error TEXT, created_at TEXT NOT NULL);
    CREATE TABLE quiz_items (id TEXT PRIMARY KEY NOT NULL, quiz_id TEXT NOT NULL REFERENCES quizzes(id), position INTEGER NOT NULL,
      item_json TEXT NOT NULL, UNIQUE(quiz_id,position));
    CREATE TABLE attempts (id TEXT PRIMARY KEY NOT NULL, quiz_id TEXT NOT NULL UNIQUE REFERENCES quizzes(id),
      status TEXT NOT NULL CHECK(status IN ('in_progress','submitted')), correct_count INTEGER, scorable_count INTEGER, score INTEGER,
      started_at TEXT NOT NULL, submitted_at TEXT);
    CREATE TABLE responses (attempt_id TEXT NOT NULL REFERENCES attempts(id), item_id TEXT NOT NULL REFERENCES quiz_items(id),
      selected_index INTEGER CHECK(selected_index BETWEEN 0 AND 3), excluded INTEGER NOT NULL DEFAULT 0 CHECK(excluded IN (0,1)),
      is_correct INTEGER, scorable INTEGER, PRIMARY KEY(attempt_id,item_id));
    CREATE TRIGGER quiz_item_immutable BEFORE UPDATE ON quiz_items BEGIN SELECT RAISE(ABORT,'Quiz snapshot immutable'); END;
    CREATE TRIGGER quiz_ready_immutable BEFORE UPDATE ON quizzes WHEN OLD.status='ready' BEGIN SELECT RAISE(ABORT,'Quiz snapshot immutable'); END;
    CREATE TRIGGER attempt_submitted_immutable BEFORE UPDATE ON attempts WHEN OLD.status='submitted' BEGIN SELECT RAISE(ABORT,'Attempt already submitted'); END;
    CREATE TRIGGER response_submitted_immutable BEFORE UPDATE ON responses WHEN (SELECT status FROM attempts WHERE id=OLD.attempt_id)='submitted' BEGIN SELECT RAISE(ABORT,'Attempt already submitted'); END;
    CREATE TRIGGER response_submitted_insert BEFORE INSERT ON responses WHEN (SELECT status FROM attempts WHERE id=NEW.attempt_id)='submitted' BEGIN SELECT RAISE(ABORT,'Attempt already submitted'); END;
  `);
} };
