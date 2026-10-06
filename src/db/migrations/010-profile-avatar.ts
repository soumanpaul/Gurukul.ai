import type { Migration } from '../types.ts';

export const profileAvatarMigration: Migration = {
  version: 10,
  async apply(database) {
    await database.execAsync("ALTER TABLE profile ADD COLUMN avatar TEXT CHECK (avatar IN ('boy', 'girl'));");
  },
};
