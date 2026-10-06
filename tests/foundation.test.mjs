import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { migrate, DatabaseVersionError } from '../src/db/migrate.ts';
import { foundationMigration } from '../src/db/migrations/001-foundation.ts';
import { initializeFoundation } from '../src/services/foundation.ts';
import { validateProfile } from '../src/domain/profile.ts';
import { syntheticNotebook } from '../src/domain/fixtures.ts';
import { mainRoutes } from '../app/routes.ts';
import { createRepository } from '../src/adapters/sqlite/repository.ts';

function connect(path = ':memory:') {
  const connection = new DatabaseSync(path);
  const database = {
    async execAsync(sql) { connection.exec(sql); },
    async runAsync(sql, ...params) { return connection.prepare(sql).run(...params); },
    async getFirstAsync(sql, ...params) { return connection.prepare(sql).get(...params) ?? null; },
    async getAllAsync(sql, ...params) { return connection.prepare(sql).all(...params); },
    async withExclusiveTransactionAsync(work) {
      connection.exec('BEGIN IMMEDIATE');
      try { await work(database); connection.exec('COMMIT'); }
      catch (error) { connection.exec('ROLLBACK'); throw error; }
    },
  };
  return { database, close: () => connection.close() };
}

test('fresh install and repeated initialization produce seven migrations and one labeled fixture', async () => {
  const storage = connect();
  try {
    const first = await initializeFoundation(storage.database);
    assert.equal(first.profile, null);
    assert.equal(first.notebooks[0].id, syntheticNotebook.id);
    const second = await initializeFoundation(storage.database);
    assert.equal(second.notebooks.length, 1);
    assert.equal((await storage.database.getAllAsync('SELECT * FROM schema_migrations')).length, 7);
    assert.equal((await storage.database.getFirstAsync('PRAGMA foreign_keys')).foreign_keys, 1);
  } finally { storage.close(); }
});

test('profile survives a real SQLite close/reopen and preserves identity on edit', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'gurukul-t1-'));
  const path = join(directory, 'profile.db');
  const original = connect(path);
  const foundation = await initializeFoundation(original.database);
  const saved = await foundation.repository.saveProfile({ nickname: "  সৌমন '); DROP TABLE profile; --  ", language: 'bn' });
  original.close();
  const reopened = connect(path);
  try {
    const next = await initializeFoundation(reopened.database);
    assert.deepEqual(next.profile, saved);
    const updated = await next.repository.saveProfile({ nickname: 'Asha', language: 'hi' });
    assert.equal(updated.id, saved.id);
    assert.equal(updated.createdAt, saved.createdAt);
    assert.equal((await reopened.database.getAllAsync('SELECT * FROM profile')).length, 1);
    assert.equal(next.notebooks.length, 1);
  } finally { reopened.close(); }
});

test('failed migration rolls back both DDL and data without losing a profile', async () => {
  const storage = connect();
  try {
    await migrate(storage.database, [foundationMigration]);
    const foundation = { repository: createRepository(storage.database) };
    const before = await foundation.repository.saveProfile({ nickname: 'Asha', language: 'en' });
    await assert.rejects(migrate(storage.database, [foundationMigration, {
      version: 2,
      async apply(transaction) {
        await transaction.execAsync("CREATE TABLE interrupted (id TEXT); UPDATE profile SET display_name = 'Wrong';");
        throw new Error('simulated interruption');
      },
    }]), /simulated interruption/);
    assert.deepEqual(await foundation.repository.readProfile(), before);
    assert.equal(await storage.database.getFirstAsync("SELECT name FROM sqlite_master WHERE name = 'interrupted'"), null);
    assert.equal((await storage.database.getAllAsync('SELECT * FROM schema_migrations')).length, 1);
  } finally { storage.close(); }
});

test('future schema and non-contiguous history fail safely, not reset', async () => {
  const storage = connect();
  try {
    const foundation = await initializeFoundation(storage.database);
    await foundation.repository.saveProfile({ nickname: 'Keep me', language: 'en' });
    await storage.database.runAsync('INSERT INTO schema_migrations VALUES (?, ?)', 8, 'future');
    await assert.rejects(initializeFoundation(storage.database), DatabaseVersionError);
    assert.equal((await foundation.repository.readProfile()).nickname, 'Keep me');
    assert.equal((await storage.database.getAllAsync('SELECT * FROM schema_migrations')).length, 8);
  } finally { storage.close(); }
});

test('existing unversioned tables are never silently replaced', async () => {
  const storage = connect();
  try {
    await storage.database.execAsync("CREATE TABLE profile (note TEXT); INSERT INTO profile VALUES ('preserve');");
    await assert.rejects(initializeFoundation(storage.database), /already exists/);
    assert.equal((await storage.database.getFirstAsync('SELECT note FROM profile')).note, 'preserve');
  } finally { storage.close(); }
});

test('input validation rejects empty, oversized, control characters and invalid languages', () => {
  for (const nickname of ['', '   ', 'a'.repeat(61), 'bad\nname']) {
    assert.throws(() => validateProfile({ nickname, language: 'en' }));
  }
  assert.throws(() => validateProfile({ nickname: 'Asha', language: 'fr' }));
  assert.deepEqual(validateProfile({ nickname: '  Student  ', language: 'en' }), { nickname: 'Student', language: 'en' });
  assert.equal(validateProfile({ nickname: '🙂'.repeat(60), language: 'en' }).nickname.length, 120);
});

test('failed save preserves prior data and database constraints enforce singleton/language', async () => {
  const storage = connect();
  try {
    const foundation = await initializeFoundation(storage.database);
    const saved = await foundation.repository.saveProfile({ nickname: 'Student', language: 'en' });
    await assert.rejects(foundation.repository.saveProfile({ nickname: '', language: 'en' }));
    await assert.rejects(storage.database.runAsync('UPDATE profile SET preferred_language = ?', 'invalid'));
    await assert.rejects(storage.database.execAsync("INSERT INTO profile VALUES ('other', 1, 'Other', 'en', 'now', 'now')"));
    assert.deepEqual(await foundation.repository.readProfile(), saved);
  } finally { storage.close(); }
});

test('main routes include all foundation destinations', () => {
  assert.deepEqual([...mainRoutes], ['notebooks', 'study', 'progress', 'settings']);
});

test('T1 upgrade preserves profile and notebook while model state survives reopen', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'gurukul-t2-'));
  const path = join(directory, 'models.db');
  const storage = connect(path);
  await migrate(storage.database, [foundationMigration]);
  const profile = await createRepository(storage.database).saveProfile({ nickname: 'Preserve', language: 'bn' });
  const upgraded = await initializeFoundation(storage.database);
  assert.deepEqual(upgraded.profile, profile);
  assert.equal(upgraded.notebooks.length, 1);
  const installation = { status: 'downloading', filename: null, partial: 'download-one.partial', received: 200 };
  await upgraded.models.save(installation);
  storage.close();
  const reopened = connect(path);
  try {
    const foundation = await initializeFoundation(reopened.database);
    assert.deepEqual({ ...await foundation.models.read() }, installation);
    assert.deepEqual(foundation.profile, profile);
    await assert.rejects(foundation.models.save({ ...installation, status: 'corrupt' }));
  } finally { reopened.close(); }
});
