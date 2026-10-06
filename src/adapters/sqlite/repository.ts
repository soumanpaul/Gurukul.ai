import type { SqlExecutor } from '../../db/types.ts';
import { validateProfile } from '../../domain/profile.ts';
import type { Language, Profile, ProfileInput, ProfileAvatar } from '../../domain/profile.ts';

export type Notebook = { id: string; title: string; createdAt: string };
export type SessionStage = 'welcome' | 'teacher' | 'active';
type ProfileRow = {
  id: string; display_name: string; preferred_language: Language; avatar?: ProfileAvatar | null; created_at: string; updated_at: string;
};
const localProfileId = '4febc177-3496-44ef-a946-b40b9d2e1565';

export function createRepository(database: SqlExecutor) {
  async function readProfile(): Promise<Profile | null> {
    const row = await database.getFirstAsync<ProfileRow>('SELECT * FROM profile WHERE singleton = 1');
    if (!row) return null;
    const input = validateProfile({ nickname: row.display_name, language: row.preferred_language, avatar: row.avatar ?? undefined });
    return { ...input, id: row.id, createdAt: row.created_at, updatedAt: row.updated_at };
  }
  return {
    readProfile,
    async readSession(): Promise<SessionStage> {
      const row = await database.getFirstAsync<{ stage: SessionStage }>('SELECT stage FROM local_session WHERE singleton = 1');
      if (!row || !['welcome', 'teacher', 'active'].includes(row.stage)) throw new Error('Invalid local session');
      return row.stage;
    },
    async saveSession(stage: SessionStage) {
      if (!['welcome', 'teacher', 'active'].includes(stage)) throw new Error('Invalid local session');
      if (stage !== 'welcome' && !await readProfile()) throw new Error('Profile required');
      await database.runAsync('UPDATE local_session SET stage = ? WHERE singleton = 1', stage);
    },
    async saveProfile(input: ProfileInput): Promise<Profile> {
      const validated = validateProfile(input);
      const now = new Date().toISOString();
      await database.runAsync(`INSERT INTO profile
        (id, singleton, display_name, preferred_language, created_at, updated_at, avatar)
        VALUES (?, 1, ?, ?, ?, ?, ?)
        ON CONFLICT(singleton) DO UPDATE SET display_name = excluded.display_name,
          preferred_language = excluded.preferred_language, updated_at = excluded.updated_at,
          avatar = COALESCE(excluded.avatar, profile.avatar)`,
      localProfileId, validated.nickname, validated.language, now, now, validated.avatar ?? null);
      const profile = await readProfile();
      if (!profile) throw new Error('Profile write could not be read back.');
      return profile;
    },
    async listNotebooks(): Promise<Notebook[]> {
      return database.getAllAsync<Notebook>('SELECT id, title, created_at AS createdAt FROM notebooks ORDER BY created_at, id');
    },
  };
}
export type FoundationRepository = ReturnType<typeof createRepository>;
