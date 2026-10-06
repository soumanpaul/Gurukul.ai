import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DatabaseSync } from 'node:sqlite';
import { createHash, randomUUID } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { migrate } from '../src/db/migrate.ts';
import { createImportRepository } from '../src/adapters/sqlite/imports.ts';
import { createStudyRepository } from '../src/adapters/sqlite/study.ts';

const dataset = JSON.parse(readFileSync(new URL('./fixtures/t8/dataset.json', import.meta.url)));
test('T8 fixed dataset: retrieval recall@5, selected notebook/source isolation and immutable revisions', async () => {
  assert.equal(dataset.answerable.length, 20);
  assert.equal(dataset.absent.length, 5);
  assert.equal(dataset.injections.length, 5);
  assert.equal(dataset.quizzes.length, 10);
  const connection = new DatabaseSync(':memory:');
  const database = {
    async execAsync(sql) { connection.exec(sql); },
    async runAsync(sql, ...params) { return connection.prepare(sql).run(...params); },
    async getFirstAsync(sql, ...params) { return connection.prepare(sql).get(...params) ?? null; },
    async getAllAsync(sql, ...params) { return connection.prepare(sql).all(...params); },
    async withExclusiveTransactionAsync(work) {
      connection.exec('BEGIN');
      try { await work(database); connection.exec('COMMIT'); }
      catch (error) { connection.exec('ROLLBACK'); throw error; }
    },
  };
  try {
    await migrate(database);
    const imports = createImportRepository(database);
    const study = createStudyRepository(database);
    const notebooks = Object.fromEntries(['biology', 'physics', 'foreign'].map(subject => [subject, randomUUID()]));
    for (const [subject, notebook] of Object.entries(notebooks)) await imports.createNotebook(notebook, `T8 ${subject}`);
    const identities = {};
    for (const source of [...dataset.sources, ...dataset.distractors]) {
      const id = randomUUID(), jobId = randomUUID(), revisionId = randomUUID();
      await imports.create({ id, jobId, revisionId, notebookId: notebooks[source.subject], title: source.topic, kind: 'txt', filename: `${id}.txt` });
      await imports.inspected(jobId, { sha256: createHash('sha256').update(source.text).digest('hex'), bytes: Buffer.byteLength(source.text), pages: 1 });
      await imports.addPage(jobId, { page_number: 1, raw_text: source.text, reviewed_text: source.text, extraction_method: 'text', preview_name: null });
      await imports.transition(jobId, 'review');
      await imports.publish(jobId);
      if (source.selected === false) await imports.select(id, false);
      identities[source.id] = { id, revisionId, subject: source.subject };
    }
    const results = [];
    for (const sample of dataset.answerable) {
      const evidence = await study.retrieve(notebooks[sample.subject], sample.question);
      const expected = identities[sample.support];
      const isolated = evidence.every(item => Object.entries(identities).some(([key, identity]) => key !== 'unselected' && identity.subject === sample.subject && item.documentId === identity.id && item.revisionId === identity.revisionId));
      assert.ok(isolated, sample.id);
      results.push({ id: sample.id, recallAt5: evidence.slice(0, 5).some(item => item.documentId === expected.id && item.text.includes(sample.expectedQuote)), isolated });
    }
    const report = { dataset: dataset.version, datasetSha256: createHash('sha256').update(readFileSync(new URL('./fixtures/t8/dataset.json', import.meta.url))).digest('hex'), scope: 'Host SQLite retrieval only; no model or phone inference', results, recall: results.filter(result => result.recallAt5).length, total: 20 };
    if (existsSync('.local/t8')) writeFileSync('.local/t8/retrieval.json', JSON.stringify(report, null, 2));
    assert.ok(report.recall >= 18, `Recall ${report.recall}/20`);
    const original = identities.plants;
    const oldSection = (await study.sections(notebooks.biology)).find(item => item.documentId === original.id);
    const job = randomUUID();
    await imports.revise(original.id, job, randomUUID());
    await imports.saveDraft(job, 1, 'Revised material describes germination.');
    await imports.publish(job);
    assert.deepEqual(await study.retrieve(notebooks.biology, 'plants', oldSection.chunkId), []);
    assert.deepEqual(connection.prepare('PRAGMA foreign_key_check').all(), []);
  } finally { connection.close(); }
});
