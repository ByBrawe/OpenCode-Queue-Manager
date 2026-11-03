import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MAX_BATCH, normalizeCount, repeatMessage, parseMessageLines,
  moveAt, deleteAt, editAt, flushDrafts, summarize,
} from '../src/queue-core.mjs';

test('repeat supports user-chosen 100 or 200 count', () => {
  assert.equal(repeatMessage('devam et', 100).length, 100);
  assert.equal(repeatMessage('continue', '200').length, 200);
  assert.deepEqual(repeatMessage('a', 3), ['a', 'a', 'a']);
  assert.equal(normalizeCount(MAX_BATCH), MAX_BATCH);
  for (const invalid of [0, -1, 2.5, 501, 'hello', Infinity]) {
    assert.throws(() => normalizeCount(invalid));
  }
});

test('list import ignores empty lines and works with CRLF and BOM', () => {
  assert.deepEqual(parseMessageLines('\uFEFFdevam et\r\n\r\nrun tests\r\n'), ['devam et', 'run tests']);
  assert.throws(() => parseMessageLines('\n\n'));
  assert.throws(() => parseMessageLines('a\nb\nc', 2));
});

test('edits and reorder are copies, do not mutate input', () => {
  const initial = ['a', 'b', 'c'];
  assert.deepEqual(moveAt(initial, 2, 0), ['c', 'a', 'b']);
  assert.deepEqual(editAt(initial, 1, 'z'), ['a', 'z', 'c']);
  assert.deepEqual(deleteAt(initial, 0), ['b', 'c']);
  assert.deepEqual(initial, ['a', 'b', 'c']);
  assert.equal(summarize('  foo   bar  '), 'foo bar');
});

test('publishing stops at first failed admission and keeps the rest staged', async () => {
  let staged = ['a', 'b', 'c'];
  const accepted = [];
  await assert.rejects(flushDrafts({
    getNext: () => staged[0],
    accept: async text => { if (text === 'b') throw new Error('connection failed'); accepted.push(text); },
    dropAccepted: async () => { staged = staged.slice(1); },
  }), /connection failed/);
  assert.deepEqual(accepted, ['a']);
  assert.deepEqual(staged, ['b', 'c']);
  const sent = await flushDrafts({
    getNext: () => staged[0],
    accept: async text => { accepted.push(text); },
    dropAccepted: async () => { staged = staged.slice(1); },
  });
  assert.equal(sent, 2);
  assert.deepEqual(accepted, ['a', 'b', 'c']);
  assert.deepEqual(staged, []);
});
