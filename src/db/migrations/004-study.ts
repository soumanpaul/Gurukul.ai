import type { Migration } from '../types.ts';
export const studyMigration: Migration = {
  version: 4,
  async apply(database) {
    await database.execAsync(`CREATE TABLE study_turns (
      id TEXT PRIMARY KEY NOT NULL, notebook_id TEXT NOT NULL REFERENCES notebooks(id),
      action TEXT NOT NULL CHECK(action IN ('ask','explain','summary')), question TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('generating','complete','insufficient','cancelled','interrupted','failed')),
      evidence_json TEXT NOT NULL, result_json TEXT, coverage TEXT NOT NULL,
      model_version TEXT NOT NULL, prompt_version TEXT NOT NULL, prompt_tokens INTEGER,
      error TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
    ); CREATE INDEX study_notebook_history ON study_turns(notebook_id,created_at);`);
  },
};
