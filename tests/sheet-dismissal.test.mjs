import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createSheetDismissal } from '../src/services/sheet-dismissal.ts';

test('iOS picker waits for native dismissal, not just the close request', async () => {
  const gate = createSheetDismissal();
  const events = [];
  const picker = gate.wait(() => events.push('close'), true).then(() => events.push('picker'));
  await Promise.resolve();
  assert.deepEqual(events, ['close']);
  await assert.rejects(gate.wait(() => events.push('duplicate'), true));
  gate.didDismiss();
  await picker;
  assert.deepEqual(events, ['close', 'picker']);
  gate.didDismiss();
  const retry = gate.wait(() => events.push('close-again'), true);
  gate.didDismiss();
  await retry;
});

test('direct and Android launch paths do not wait for an iOS event', async () => {
  const gate = createSheetDismissal();
  let closed = false;
  await gate.wait(() => { closed = true; }, false);
  assert.equal(closed, true);
});

test('unmount rejects a pending handoff without launching a picker', async () => {
  const gate = createSheetDismissal();
  const completion = gate.wait(() => {}, true);
  const rejected = assert.rejects(completion, /screen closed/);
  gate.cancel();
  await rejected;
  gate.didDismiss();
});
