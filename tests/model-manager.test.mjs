import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ModelManager } from '../src/services/model-manager.ts';
import { promotedModelName, requiredModelStorage, validateManifest } from '../src/domain/model.ts';
import { claimNativeSlot, withNativeSlot } from '../src/services/native-slot.ts';
import manifest from '../src/t0/model.json' with { type: 'json' };

function fixture(overrides = {}, record = null) {
  let saved = record;
  const files = new Map();
  const calls = [];
  const ports = {
    async read() { return saved; },
    async save(value) { saved = structuredClone(value); calls.push('save:' + value.status); },
    async exists(name) { return files.has(name); },
    async freeBytes() { return requiredModelStorage(manifest.bytes); },
    uniqueName() { return 'download-test.partial'; },
    async download(name, progress) { calls.push('download'); files.set(name, 'valid'); progress(manifest.bytes); },
    async verify(name) { calls.push('verify:' + name); if (files.get(name) !== 'valid') throw Error('bad hash'); return name; },
    async promote(source, destination) { calls.push('promote'); files.set(destination, files.get(source)); },
    async load() {
      calls.push('load');
      return {
        async answer() { calls.push('answer'); return { answer: 'Synthetic test double, not inference evidence', firstTokenMs: 1, completionMs: 2 }; },
        async stop() { calls.push('stop'); },
        async release() { calls.push('release'); },
      };
    },
    ...overrides,
  };
  return { manager: new ModelManager(manifest, ports), files, calls, saved: () => saved };
}

test('confirmed model removal refuses loaded contexts, preserves failures and transitions to absent', async () => {
  const sample = fixture();
  sample.files.set(manifest.filename, 'valid');
  await sample.manager.check(); await sample.manager.load();
  let removals = 0;
  await sample.manager.removeInstallation(async () => { removals++; });
  assert.equal(removals, 0); assert.equal(sample.manager.snapshot().phase, 'loaded');
  await sample.manager.unload();
  await sample.manager.removeInstallation(async () => { throw new Error('storage failure'); });
  assert.equal(sample.manager.snapshot().filename, manifest.filename);
  await sample.manager.removeInstallation(async record => { assert.equal(record.filename, manifest.filename); removals++; });
  assert.equal(removals, 1); assert.equal(sample.manager.snapshot().phase, 'absent');
  assert.equal(sample.manager.snapshot().filename, null);
});

test('returning onboarding verifies and reuses installed teacher without downloading', async () => {
  const sample = fixture({}, {status:'ready',filename:manifest.filename,partial:null,received:manifest.bytes});
  sample.files.set(manifest.filename,'valid');
  await sample.manager.check();
  await sample.manager.check();
  assert.equal(sample.manager.snapshot().phase,'ready');
  assert.equal(sample.manager.snapshot().filename,manifest.filename);
  assert.equal(sample.calls.filter(call=>call==='download').length,0);
  assert.equal(sample.calls.filter(call=>call==='load').length,0);
});

test('manifest rejects untrusted origin, mutable revision and unsafe paths', () => {
  validateManifest(manifest);
  for (const patch of [{ url: 'http://example.com/model' }, { revision: 'main' }, { filename: '../bad.gguf' }, { bytes: NaN }]) {
    assert.throws(() => validateManifest({ ...manifest, ...patch }));
  }
});

test('offline discovery verifies preinstalled model without network or trusting saved ready', async () => {
  const { manager, files, calls } = fixture();
  files.set(manifest.filename, 'valid');
  await manager.check();
  assert.equal(manager.snapshot().phase, 'ready');
  assert.match(manager.snapshot().message, /preinstalled/);
  assert.ok(!calls.includes('download'));
  files.set(manifest.filename, 'corrupt');
  await manager.load();
  assert.equal(manager.snapshot().filename, null);
  assert.ok(!calls.includes('load'));
});

test('insufficient disk and offline failures never load or promote and retain notes-independent state', async () => {
  const low = fixture({ async freeBytes() { return 1; } });
  await low.manager.download();
  assert.match(low.manager.snapshot().message, /Not enough storage/);
  assert.ok(!low.calls.includes('download'));
  const offline = fixture({ async download() { throw Error('network'); } });
  await offline.manager.download();
  assert.equal(offline.manager.snapshot().phase, 'failed');
  assert.equal(offline.saved().partial, 'download-test.partial');
  assert.ok(!offline.calls.includes('promote'));
});

test('full size/hash verification precedes promotion; bad hash retains partial, never ready', async () => {
  const valid = fixture();
  await valid.manager.download();
  assert.equal(valid.manager.snapshot().phase, 'ready');
  assert.ok(valid.calls.indexOf('verify:download-test.partial') < valid.calls.indexOf('promote'));
  const bad = fixture({ async verify() { throw Error('wrong hash/size'); } });
  await bad.manager.download();
  assert.equal(bad.manager.snapshot().phase, 'failed');
  assert.ok(!bad.calls.includes('promote'));
  assert.equal(bad.saved().partial, 'download-test.partial');
});

test('cancelled transfer is checkpointed; restart notices interrupted partial, never auto-downloads', async () => {
  let started;
  const began = new Promise(resolve => { started = resolve; });
  const sample = fixture({ async download(name, progress, signal) {
    progress(120); started();
    await new Promise((resolve, reject) => signal.addEventListener('abort', () => reject(Error('aborted')), { once: true }));
  } });
  const pending = sample.manager.download();
  await began;
  await sample.manager.cancel(); await pending;
  assert.equal(sample.saved().status, 'paused');
  assert.equal(sample.saved().received, 120);
  assert.ok(!sample.calls.includes('promote'));
  const reopened = fixture({}, sample.saved());
  await reopened.manager.check();
  assert.equal(reopened.manager.snapshot().phase, 'paused');
  assert.match(reopened.manager.snapshot().message, /zero/);
  assert.ok(!reopened.calls.includes('download'));
});

test('crash after promotion before metadata write recovers by full verification', async () => {
  const sample = fixture({}, { status: 'verifying', filename: null, partial: 'download-test.partial', received: manifest.bytes });
  sample.files.set(promotedModelName(manifest, 'download-test.partial'), 'valid');
  await sample.manager.check();
  assert.equal(sample.manager.snapshot().phase, 'ready');
});

test('load/generate/unload is serialized; background interrupts generation and releases context', async () => {
  let finish;
  let started;
  const began = new Promise(resolve => { started = resolve; });
  let loads = 0; let answers = 0; let releases = 0;
  const sample = fixture({ async load() {
    loads++;
    return {
      async answer() { answers++; started(); return new Promise(resolve => { finish = resolve; }); },
      async stop() { finish?.({ answer: 'cancelled', firstTokenMs: null, completionMs: 0 }); },
      async release() { releases++; },
    };
  } });
  sample.files.set(manifest.filename, 'valid');
  await sample.manager.check();
  await Promise.all([sample.manager.load(), sample.manager.load()]);
  const pending = sample.manager.answer(); await began;
  await sample.manager.answer();
  await sample.manager.setForeground(false); await pending;
  assert.equal(loads, 1); assert.equal(answers, 1); assert.equal(releases, 1);
  assert.equal(sample.manager.snapshot().phase, 'ready');
  assert.doesNotMatch(sample.manager.snapshot().message, /Synthetic check/);
});

test('cancellation during native load waits then releases without using context', async () => {
  let finish; let started;
  const began = new Promise(resolve => { started = resolve; });
  let released = 0;
  const sample = fixture({ async load() {
    started(); return new Promise(resolve => { finish = () => resolve({ async release() { released++; }, async stop() {}, async answer() { throw Error('must not run'); } }); });
  } });
  sample.files.set(manifest.filename, 'valid');
  await sample.manager.check();
  const pending = sample.manager.load(); await began;
  await sample.manager.cancel(); finish(); await pending;
  assert.equal(released, 1);
  assert.equal(sample.manager.snapshot().phase, 'ready');
});

test('global native lease blocks diagnostics/OCR and releases on failure', async () => {
  const release = claimNativeSlot();
  assert.throws(claimNativeSlot, /busy/);
  await assert.rejects(withNativeSlot(async () => 'OCR'), /busy/);
  release(); release();
  await assert.rejects(withNativeSlot(async () => { throw Error('failure'); }), /failure/);
  assert.equal(await withNativeSlot(async () => 'ok'), 'ok');
});

test('failed replacement preserves verified model; corrupt old file gets a different destination', async () => {
  const sample = fixture({ async verify(name) {
    if (name.endsWith('.partial')) throw Error('bad new hash');
    return name;
  } });
  sample.files.set(manifest.filename, 'valid');
  await sample.manager.check();
  await sample.manager.download();
  assert.equal(sample.manager.snapshot().filename, manifest.filename);
  assert.equal(sample.manager.snapshot().phase, 'ready');
  assert.match(sample.manager.snapshot().message, /SHA-256/);
  assert.equal(sample.files.get(manifest.filename), 'valid');
  const corrupt = fixture();
  corrupt.files.set(manifest.filename, 'corrupt');
  await corrupt.manager.check();
  assert.equal(corrupt.manager.snapshot().phase, 'failed');
  await corrupt.manager.download();
  assert.equal(corrupt.manager.snapshot().phase, 'ready');
  assert.notEqual(corrupt.manager.snapshot().filename, manifest.filename);
  assert.equal(corrupt.files.get(manifest.filename), 'corrupt');
});

test('oversized transfer is aborted before verification or promotion', async () => {
  const sample = fixture({ async download(name, progress, signal) {
    progress(manifest.bytes + 1);
    assert.equal(signal.aborted, true);
    throw Error('oversized');
  } });
  await sample.manager.download();
  assert.equal(sample.manager.snapshot().phase, 'failed');
  assert.ok(!sample.calls.includes('promote'));
});
