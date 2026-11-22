
const assert = require('node:assert/strict');
const test = require('node:test');
const { activityAt, activityWindow, mapCoordinates } = require('../src/utils/lab-activity.ts');

test('validates coordinates without creating a fallback point', () => {
  assert.deepEqual(mapCoordinates({ latitude: -7, longitude: 110 }), { latitude: -7, longitude: 110 });
  for (const value of [null, {}, { latitude: NaN, longitude: 110 }, { latitude: 91, longitude: 110 }]) {
    assert.equal(mapCoordinates(value), null);
  }
});

test('shows all overlapping sessions in stable order and advances across boundaries', () => {
  const items = [
    { sessionId: 'b', start: 10, end: 25 },
    { sessionId: 'a', start: 10, end: 18 },
    { sessionId: 'c', start: 20, end: 40 },
  ];
  assert.deepEqual(activityAt(items, 10).current.map((row) => row.sessionId), ['a', 'b']);
  assert.equal(activityAt(items, 18).next.sessionId, 'c');
  assert.deepEqual(activityAt(items, 20).current.map((row) => row.sessionId), ['b', 'c']);
  assert.equal(activityAt(items, 40).next, undefined);
});

test('rolls the seven-day query at midnight Jakarta time', () => {
  const midnight = Date.parse('2026-11-22T17:00:00Z');
  assert.equal(activityWindow(midnight - 1).rollover, midnight);
  assert.equal(activityWindow(midnight).start, midnight);
  assert.equal(activityWindow(midnight).end, Date.parse('2026-11-29T17:00:00Z'));
});
