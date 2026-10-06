import type { Migration } from '../types.ts';

export const buddyMigration: Migration = {
  version: 9,
  async apply(database) {
    await database.execAsync(`CREATE TABLE buddy_chats (
      id TEXT PRIMARY KEY NOT NULL, title TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
    );
    CREATE TABLE buddy_turns (
      id TEXT PRIMARY KEY NOT NULL, chat_id TEXT NOT NULL REFERENCES buddy_chats(id) ON DELETE CASCADE,
      question TEXT NOT NULL, answer TEXT, status TEXT NOT NULL CHECK(status IN ('generating','complete','failed','cancelled','interrupted')),
      error TEXT, model_version TEXT NOT NULL, prompt_version TEXT NOT NULL,
      prompt_tokens INTEGER, omitted_turns INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL
    );
    CREATE INDEX buddy_turns_chat ON buddy_turns(chat_id, created_at);
    CREATE UNIQUE INDEX buddy_one_active_turn ON buddy_turns(chat_id) WHERE status='generating';`);
  },
};
