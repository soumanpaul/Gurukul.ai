import { migrate } from '../db/migrate.ts';
import type { Database } from '../db/types.ts';
import { createRepository } from '../adapters/sqlite/repository.ts';
import { createModelRepository } from '../adapters/sqlite/models.ts';
import manifest from '../t0/model.json' with { type: 'json' };
import { createImportRepository } from '../adapters/sqlite/imports.ts';
import { createStudyRepository } from '../adapters/sqlite/study.ts';
import { createQuizRepository } from '../adapters/sqlite/quizzes.ts';
import { createProgressRepository } from '../adapters/sqlite/progress.ts';
import { createStorageRepository } from '../adapters/sqlite/storage.ts';
import { createBuddyRepository } from '../adapters/sqlite/buddy.ts';

export async function initializeFoundation(database: Database) {
  await migrate(database);
  const imports = createImportRepository(database);
  await imports.recover();
  const study = createStudyRepository(database);
  await study.recover();
  const quizzes = createQuizRepository(database);
  await quizzes.recover();
  const buddy = createBuddyRepository(database);
  await buddy.recover();
  const repository = createRepository(database);
  const [profile, notebooks, session] = await Promise.all([repository.readProfile(), repository.listNotebooks(), repository.readSession()]);
  return { repository, profile, notebooks, session, buddy, models: createModelRepository(database, manifest), imports, study, quizzes, progress: createProgressRepository(database), storage: createStorageRepository(database) };
}
export type Foundation = Awaited<ReturnType<typeof initializeFoundation>>;
