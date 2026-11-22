const assert = require('node:assert/strict');
const { test } = require('node:test');

const { resolvePresensiAvailability } = require('../src/services/attendance/session-guard.ts');

const existingRecord = {
  id: 'sess-01__uid-1',
  sessionId: 'sess-01',
  studentUid: 'uid-1',
  studentId: '24060122100001',
  studentName: 'Praktikan Demo',
  className: 'IF-3A',
  checkInTime: '08:10:00',
  checkedInAtMillis: 1790000000000,
};

test('prioritizes existing attendance record without requesting rescan', () => {
  const result = resolvePresensiAvailability('DIBUKA', existingRecord);
  assert.equal(result.kind, 'already-attended');
  assert.equal(result.canScan, false);
});

test('enables scan only when session is DIBUKA and not yet attended', () => {
  assert.equal(resolvePresensiAvailability('DIBUKA', null).canScan, true);
  assert.equal(resolvePresensiAvailability('TERJADWAL', null).kind, 'scheduled');
  assert.equal(resolvePresensiAvailability('SELESAI', null).kind, 'closed');
  assert.equal(resolvePresensiAvailability('SELESAI', null).canScan, false);
});
