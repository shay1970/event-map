import { test } from 'node:test';
import assert from 'node:assert/strict';
import { translateMany } from '../lib/translate.js';

test('translates in batches, keeps originals on failure', async () => {
  const realFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async url => {
    calls++;
    const q = new URL(url).searchParams.get('q');
    if (q.includes('FAIL')) return { ok: false, status: 429 };
    return { ok: true, json: async () => [q.split('\n').map((l, i, a) => ['עב:' + l + (i < a.length - 1 ? '\n' : '')])] };
  };
  try {
    const r = await translateMany(['Oil jumps', 'Stocks fall', 'Oil jumps', ''], 'en', 'iw');
    assert.deepEqual(r.texts, ['עב:Oil jumps', 'עב:Stocks fall', 'עב:Oil jumps', '']);
    assert.equal(r.ok, true);
    assert.equal(calls, 1); // one batched request, duplicates collapsed
    const f = await translateMany(['FAIL here'], 'en', 'iw');
    assert.deepEqual(f.texts, ['FAIL here']);
    assert.equal(f.ok, false);
  } finally { globalThis.fetch = realFetch; }
});
