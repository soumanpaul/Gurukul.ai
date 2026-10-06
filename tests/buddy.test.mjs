import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DatabaseSync } from 'node:sqlite';
import { randomUUID } from 'node:crypto';
import { buddyPrompt, validateBuddy, validateBuddyQuestion } from '../src/domain/buddy.ts';
import { createBuddyRepository } from '../src/adapters/sqlite/buddy.ts';
import { buddyMigration } from '../src/db/migrations/009-buddy.ts';
import { BuddyManager } from '../src/services/buddy-manager.ts';

async function setup() {
  const connection = new DatabaseSync(':memory:');
  connection.exec('PRAGMA foreign_keys=ON; CREATE TABLE existing_notes(id TEXT); INSERT INTO existing_notes VALUES (\'kept\');');
  const database = {
    async execAsync(sql) { connection.exec(sql); },
    async runAsync(sql, ...values) { return connection.prepare(sql).run(...values); },
    async getFirstAsync(sql, ...values) { return connection.prepare(sql).get(...values) ?? null; },
    async getAllAsync(sql, ...values) { return connection.prepare(sql).all(...values); },
    async withExclusiveTransactionAsync(work) { connection.exec('BEGIN'); try { await work(database); connection.exec('COMMIT'); } catch (error) { connection.exec('ROLLBACK'); throw error; } },
  };
  await buddyMigration.apply(database);
  return { connection, database, repository: createBuddyRepository(database) };
}
const reply = JSON.stringify({ answer: 'A synthetic test reply, not model evidence.' });
test('prompt keeps chronological pairs in one bounded context; oversized messages rejected', async () => {
  const history = Array.from({ length: 8 }, (_, index) => ({ question: `question ${index}`, answer: `answer ${index}`, status: 'complete' }));
  history.push({ question: 'failed secret', answer: null, status: 'failed' });
  const result = await buddyPrompt('Follow up', history, async messages => messages.length * 200);
  assert.equal(result.tokens, 1200);
  assert.equal(result.omitted, 6);
  assert.deepEqual(result.messages.map(item => item.role), ['system','user','assistant','user','assistant','user']);
  assert.equal(result.messages[1].content, 'question 6');
  assert.equal(result.messages.at(-1).content, 'Follow up');
  assert.ok(!JSON.stringify(result).includes('failed secret'));
  await assert.rejects(buddyPrompt('hello', [], async () => 1451), /too long/);
  assert.throws(() => validateBuddyQuestion('বাংলা'));
});
test('output validation rejects malformed, empty, thinking and unexpected structure', () => {
  for (const text of ['oops', '{}', '{"answer":""}', '{"answer":"<think>secret</think>"}', '{"answer":"ok","sql":"DROP"}']) assert.throws(() => validateBuddy(text));
  assert.equal(validateBuddy(reply), 'A synthetic test reply, not model evidence.');
});
test('migration, conversation isolation, context provenance, recovery and scoped deletion preserve other data', async () => {
  const sample = await setup();
  try {
    const repository = sample.repository;
    await repository.begin('one', 'first', 'Hello', 'test-model'); await repository.context('first', 400, 2); await repository.finish('first', reply);
    await repository.begin('two', 'second', 'Other chat', 'test-model');
    assert.equal((await repository.turns('one')).length, 1);
    await assert.rejects(repository.begin('two', 'third', 'Concurrent', 'test-model'));
    await assert.rejects(repository.remove('two'));
    await repository.recover();
    assert.equal((await repository.turns('two'))[0].status, 'interrupted');
    const saved = (await repository.turns('one'))[0];
    assert.equal(saved.prompt_tokens, 400); assert.equal(saved.omitted_turns, 2); assert.equal(saved.status, 'complete');
    assert.equal(saved.prompt_version, 'buddy-v1');
    await repository.remove('two');
    assert.equal((await repository.turns('one')).length, 1); assert.equal((await repository.turns('two')).length, 0);
    assert.equal(sample.connection.prepare('SELECT id FROM existing_notes').get().id, 'kept');
    assert.deepEqual(sample.connection.prepare('PRAGMA foreign_key_check').all(), []);
  } finally { sample.connection.close(); }
});
test('manager supplies prior complete turns only from the same chat, never notes; truncation is a visible failure', async () => {
  const sample = await setup(); let truncated = false; const prompts = [];
  const manager = new BuddyManager(sample.repository, { id: randomUUID, model: 'test-model', load: async () => ({ count: async () => 200, generate: async messages => { prompts.push(messages); return { text: reply, truncated }; }, stop: async () => {}, release: async () => {} }) });
  try {
    await manager.run('one', 'Remember Mars'); await manager.run('one', 'Which planet?'); await manager.run('two', 'Hello');
    assert.equal(prompts[1].length, 4); assert.equal(prompts[2].length, 2);
    assert.ok(JSON.stringify(prompts[1]).includes('Remember Mars')); assert.ok(!JSON.stringify(prompts[2]).includes('Remember Mars'));
    truncated = true; await manager.run('two', 'Try again');
    const failed = (await sample.repository.turns('two')).at(-1); assert.equal(failed.status, 'failed'); assert.equal(failed.answer, null);
    assert.ok(manager.snapshot().error); assert.equal(manager.snapshot().busy, false);
  } finally { sample.connection.close(); }
});
test('cancel/background drops late output, releases runtime and allows retry', async () => {
  const sample = await setup(); let finish; let releaseCount = 0; let started;
  const ready = new Promise(resolve => { started = resolve; });
  const manager = new BuddyManager(sample.repository, { id: randomUUID, model: 'test-model', load: async () => ({ count: async () => 200, generate: async () => { started(); return new Promise(resolve => { finish = resolve; }); }, stop: async () => {}, release: async () => { releaseCount++; } }) });
  try {
    const running = manager.run('one', 'Hello'); await ready;
    await manager.run('one', 'Duplicate tap');
    await manager.setForeground(false); finish({ text: reply, truncated: false }); await running;
    const turns = await sample.repository.turns('one'); assert.equal(turns.length, 1); assert.equal(turns[0].status, 'cancelled'); assert.equal(turns[0].answer, null); assert.equal(releaseCount, 1);
    await manager.setForeground(true);
    const retry = manager.run('one', 'Hello again');
    while (!manager.snapshot().progress.includes('replying')) await new Promise(resolve => setTimeout(resolve, 1));
    finish({ text: reply, truncated: false }); await retry;
    assert.equal((await sample.repository.turns('one')).at(-1).status, 'complete');
  } finally { sample.connection.close(); }
});
