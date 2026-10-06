import type { Migration } from '../types.ts';

export const localSessionMigration: Migration = {
  version: 8,
  async apply(transaction) {
    await transaction.execAsync(`CREATE TABLE local_session (
      singleton INTEGER PRIMARY KEY CHECK (singleton = 1),
      stage TEXT NOT NULL CHECK (stage IN ('welcome', 'teacher', 'active'))
    );
    INSERT INTO local_session (singleton, stage)
      SELECT 1, CASE WHEN EXISTS (SELECT 1 FROM profile) THEN 'active' ELSE 'welcome' END;`);
  },
};
