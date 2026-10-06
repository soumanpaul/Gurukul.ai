import assert from 'node:assert/strict';
import { test } from 'node:test';
import { changes, patchText, prepare } from '../scripts/private-llama.mjs';

test('private native patch is exact, idempotent and fails closed on changed dependency sources', () => {
  for (const [, original, replacement] of changes) {
    const fixture = `before\n${original}\nafter`;
    const result = patchText(fixture, original, replacement);
    assert.ok(result.includes(replacement));
    assert.equal(patchText(result, original, replacement), result);
    assert.throws(() => patchText('unsupported source', original, replacement));
    assert.throws(() => patchText(`${fixture}\n${fixture}`, original, replacement));
  }
});
test('installed pinned dependency has every private logging/source-build patch', () => {
  prepare(process.cwd(), true);
});
