import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DatabaseSync } from 'node:sqlite';
import { createHash, randomUUID } from 'node:crypto';
import { migrate } from '../src/db/migrate.ts';
import { foundationMigration } from '../src/db/migrations/001-foundation.ts';
import { modelMigration } from '../src/db/migrations/002-model-installations.ts';
import { createImportRepository } from '../src/adapters/sqlite/imports.ts';
import { ImportManager } from '../src/services/import-manager.ts';
import { ImportFailure, kindFromName, pageChunks, reviewedText } from '../src/domain/imports.ts';
import { permittedCapture } from '../src/services/camera-permission.ts';

async function setup() {
  const connection = new DatabaseSync(':memory:');
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
  await migrate(database, [foundationMigration, modelMigration]);
  connection.exec("INSERT INTO profile VALUES ('preserve',1,'Keep me','en','now','now')");
  await migrate(database);
  const repository = createImportRepository(database);
  const notebookId = randomUUID(); await repository.createNotebook(notebookId, 'Biology');
  const files = new Map();
  const ports = {
    id: randomUUID,
    async copy(input, filename) { files.set(filename, input.text ?? 'Plants use sunlight.'); },
    async inspect(filename) {
      if (!files.has(filename)) throw new ImportFailure('MISSING');
      const text = files.get(filename);
      return { bytes: Buffer.byteLength(text), sha256: createHash('sha256').update(text).digest('hex'), pages: 1 };
    },
    async page(filename) { return { raw_text: files.get(filename), extraction_method: 'text', preview_name: null }; },
    claim() { return () => {}; },
  };
  const manager = new ImportManager(repository, ports);
  async function start(text = 'Plants use sunlight to make food.') {
    return manager.start({ notebookId, title: 'Class notes', kind: 'txt', text });
  }
  return { connection, database, repository, notebookId, files, ports, manager, start };
}

test('T2 upgrade preserves profile/notebooks, adds FTS and real FK enforcement', async () => {
  const sample = await setup();
  try {
    assert.equal(sample.connection.prepare('SELECT display_name FROM profile').get().display_name, 'Keep me');
    assert.equal(sample.connection.prepare('SELECT count(*) AS count FROM notebooks').get().count, 2);
    assert.equal(sample.connection.prepare('PRAGMA foreign_keys').get().foreign_keys, 1);
    await assert.rejects(sample.repository.create({ id: 'bad', jobId: 'bad', revisionId: 'bad', notebookId: 'missing', title: 'Notes', kind: 'txt', filename: 'bad.txt' }));
  } finally { sample.connection.close(); }
});

test('review gates indexing, publishing is idempotent and provenance/offsets match source page', async () => {
  const sample = await setup();
  try {
    const jobId = await sample.start();
    assert.equal((await sample.repository.job(jobId)).status, 'review');
    assert.deepEqual(await sample.repository.search(sample.notebookId, 'sunlight'), []);
    await sample.repository.publish(jobId); await sample.repository.publish(jobId);
    const result = await sample.repository.search(sample.notebookId, 'sunlight');
    assert.equal(result.length, 1); assert.equal(result[0].page_number, 1);
    const row = sample.connection.prepare('SELECT c.*,p.reviewed_text,p.raw_text FROM chunks c JOIN pages p ON p.id=c.page_id').get();
    assert.equal(row.text, row.reviewed_text.slice(row.start_offset, row.end_offset));
    assert.equal(row.raw_text, 'Plants use sunlight to make food.');
    assert.equal(sample.connection.prepare('SELECT count(*) AS count FROM document_revisions').get().count, 1);
  } finally { sample.connection.close(); }
});

test('duplicate content reuses same notebook source, while different notebooks stay isolated', async () => {
  const sample = await setup();
  try {
    const first = await sample.start(); await sample.repository.publish(first);
    const duplicate = await sample.start();
    assert.equal((await sample.repository.job(duplicate)).status, 'duplicate');
    await assert.rejects(sample.repository.publish(duplicate));
    const other = randomUUID(); await sample.repository.createNotebook(other, 'Other');
    const job = await sample.manager.start({ notebookId: other, title: 'Notes', kind: 'txt', text: 'Plants use sunlight to make food.' });
    await sample.repository.publish(job);
    assert.equal((await sample.repository.search(sample.notebookId, 'sunlight')).length, 1);
    assert.equal((await sample.repository.search(other, 'sunlight')).length, 1);
    const source = (await sample.repository.job(first)).document_id;
    await sample.repository.select(source, false);
    assert.deepEqual(await sample.repository.search(sample.notebookId, 'sunlight'), []);
  } finally { sample.connection.close(); }
});

test('empty OCR enters editable review, but empty or unsupported-script review cannot be indexed', async () => {
  const sample = await setup();
  try {
    sample.ports.page = async () => ({ raw_text: '', extraction_method: 'image-ocr', preview_name: 'preview.jpg' });
    const manager = new ImportManager(sample.repository, sample.ports);
    const job = await manager.start({ notebookId: sample.notebookId, title: 'Blank image', kind: 'png', uri: 'local' });
    assert.equal((await sample.repository.job(job)).status, 'review');
    await assert.rejects(sample.repository.publish(job), error => error.code === 'EMPTY');
    await sample.repository.saveDraft(job, 1, 'বাংলা');
    await assert.rejects(sample.repository.publish(job), error => error.code === 'SCRIPT');
    await sample.repository.saveDraft(job, 1, 'Corrected printed English text.');
    await sample.repository.publish(job);
    assert.equal((await sample.repository.search(sample.notebookId, 'Corrected')).length, 1);
    assert.equal(sample.connection.prepare('SELECT raw_text FROM pages').get().raw_text, '');
  } finally { sample.connection.close(); }
});

test('revision replaces only active search entries; published text and provenance remain immutable', async () => {
  const sample = await setup();
  try {
    const first = await sample.start('Chlorophyll absorbs sunlight.'); await sample.repository.publish(first);
    const document = (await sample.repository.job(first)).document_id;
    const next = randomUUID(); await sample.repository.revise(document, next, randomUUID());
    await sample.repository.saveDraft(next, 1, 'Leaves contain chloroplasts.');
    assert.equal((await sample.repository.search(sample.notebookId, 'sunlight')).length, 1);
    await sample.repository.publish(next);
    assert.deepEqual(await sample.repository.search(sample.notebookId, 'sunlight'), []);
    assert.equal((await sample.repository.search(sample.notebookId, 'chloroplasts')).length, 1);
    assert.equal(sample.connection.prepare('SELECT count(*) AS count FROM document_revisions').get().count, 2);
    assert.throws(() => sample.connection.exec("UPDATE pages SET reviewed_text='tampered'"), /immutable/);
  } finally { sample.connection.close(); }
});

test('index transaction failure rolls back revision, chunks, pointer and FTS replacement together', async () => {
  const sample = await setup();
  try {
    const first = await sample.start(); await sample.repository.publish(first);
    const document = (await sample.repository.job(first)).document_id;
    const next = randomUUID(); await sample.repository.revise(document, next, randomUUID());
    await sample.repository.saveDraft(next, 1, 'FAIL new content');
    sample.connection.exec("CREATE TRIGGER fail_chunk BEFORE INSERT ON chunks WHEN NEW.text LIKE 'FAIL%' BEGIN SELECT RAISE(ABORT,'simulated full storage'); END;");
    await assert.rejects(sample.repository.publish(next), /simulated/);
    assert.equal((await sample.repository.search(sample.notebookId, 'sunlight')).length, 1);
    assert.equal((await sample.repository.job(next)).status, 'review');
    assert.equal(sample.connection.prepare('SELECT count(*) AS count FROM document_revisions').get().count, 1);
  } finally { sample.connection.close(); }
});

test('cancellation between PDF pages retains checkpoint; retry skips completed pages and cannot overlap', async () => {
  const sample = await setup();
  let resolvePage; let pageStarted;
  const waiting = new Promise(resolve => { pageStarted = resolve; });
  const calls = [];
  const inspect = sample.ports.inspect;
  sample.ports.inspect = async filename => ({ ...await inspect(filename), pages: 2 });
  sample.ports.page = async (filename, kind, number) => {
    calls.push(number);
    if (number === 2 && !resolvePage) { pageStarted(); await new Promise(resolve => { resolvePage = resolve; }); }
    return { raw_text: `Page ${number} sunlight`, extraction_method: 'pdf-ocr', preview_name: null };
  };
  const manager = new ImportManager(sample.repository, sample.ports);
  try {
    const pending = manager.start({ notebookId: sample.notebookId, title: 'PDF', kind: 'pdf', uri: 'local' });
    await waiting;
    assert.equal(await manager.start({ notebookId: sample.notebookId, title: 'Second', kind: 'txt', text: 'No overlap' }), null);
    manager.cancel(); resolvePage(); await pending;
    const jobId = manager.snapshot().jobId;
    assert.equal((await sample.repository.job(jobId)).status, 'cancelled');
    assert.equal((await sample.repository.pages(jobId)).length, 1);
    await manager.retry(jobId); await sample.repository.publish(jobId);
    assert.deepEqual(calls, [1,2,2]);
    assert.deepEqual((await sample.repository.search(sample.notebookId, 'sunlight')).map(row => row.page_number).sort(), [1,2]);
  } finally { sample.connection.close(); }
});

test('interrupted copy recovery and missing original fail visibly without resetting notebooks', async () => {
  const sample = await setup();
  try {
    await sample.repository.create({ id:'source', jobId:'job', revisionId:'revision', notebookId:sample.notebookId, title:'Pending', kind:'txt', filename:'source-pending.txt' });
    await sample.repository.recover();
    assert.equal((await sample.repository.job('job')).status, 'interrupted');
    await sample.manager.retry('job');
    assert.equal((await sample.repository.job('job')).error_code, 'MISSING');
    assert.equal(sample.connection.prepare('SELECT count(*) AS count FROM notebooks').get().count, 2);
  } finally { sample.connection.close(); }
});

test('changed original hash cannot reuse extraction checkpoints', async () => {
  const sample = await setup();
  try {
    const job = await sample.start();
    await sample.repository.transition(job, 'cancelled', 'INTERRUPTED');
    const document = await sample.repository.source((await sample.repository.job(job)).document_id);
    sample.files.set(document.original_name, 'Changed bytes!');
    await sample.manager.retry(job);
    assert.equal((await sample.repository.job(job)).status, 'failed');
    assert.deepEqual(await sample.repository.search(sample.notebookId, 'Changed'), []);
  } finally { sample.connection.close(); }
});

test('bounded chunks preserve exact UTF-16 offsets, stay on a page and reject invalid text/formats', () => {
  const text = 'English sentence. '.repeat(200);
  for (const chunk of pageChunks(text)) {
    assert.equal(text.slice(chunk.start, chunk.end), chunk.text); assert.ok(chunk.text.length <= 1000);
  }
  assert.throws(() => reviewedText(' '), error => error.code === 'EMPTY');
  assert.throws(() => reviewedText('x'.repeat(20001)), error => error.code === 'LIMIT');
  assert.throws(() => reviewedText('bad\0text'), error => error.code === 'FORMAT');
  assert.equal(kindFromName('PHOTO.JPEG', 'image/jpeg'), 'jpg');
  assert.throws(() => kindFromName('photo.heic'));
  assert.throws(() => kindFromName('fake.pdf', 'image/png'));
});

test('camera denial does not launch capture or prevent a subsequent paste import', async () => {
  let captured = false;
  await assert.rejects(permittedCapture(async () => ({ granted: false }), async () => { captured = true; }), error => error.code === 'CAMERA_DENIED');
  assert.equal(captured, false);
  const sample = await setup();
  try {
    const job = await sample.start('Paste remains available.');
    assert.equal((await sample.repository.job(job)).status, 'review');
  } finally { sample.connection.close(); }
});
