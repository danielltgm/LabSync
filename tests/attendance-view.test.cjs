const assert = require('node:assert/strict');
const { test } = require('node:test');
const { Timestamp } = require('firebase/firestore');
const { personalAttendance, toAttendanceRecord } = require('../src/utils/attendance-view.ts');

test('pending server timestamps render safely and committed timestamps use Jakarta time', () => {
  const data = {
    sessionId: 'session', classId: 'class', studentUid: 'student', studentId: 'NIM',
    studentName: 'Nama', className: 'IF', checkedInAt: null,
  };
  assert.equal(toAttendanceRecord('pending', data).checkInTime, 'Menunggu sinkronisasi');
  const millis = Date.parse('2026-11-15T01:02:03Z');
  const saved = toAttendanceRecord('saved', { ...data, checkedInAt: Timestamp.fromMillis(millis) });
  assert.equal(saved.checkInTime, '08:02:03');
  assert.equal(saved.checkedInAtMillis, millis);
});

test('history uses UID and server chronology even without session metadata or after a NIM change', () => {
  const records = [
    { id: 'old', studentUid: 'student', studentId: 'old-nim', checkedInAtMillis: 100 },
    { id: 'other-user', studentUid: 'other', studentId: 'same-nim', checkedInAtMillis: 900 },
    { id: 'recent', studentUid: 'student', studentId: 'same-nim', checkedInAtMillis: 200 },
  ];
  assert.deepEqual(personalAttendance(records, 'student').map((item) => item.id), ['recent', 'old']);
  assert.deepEqual(records.map((item) => item.id), ['old', 'other-user', 'recent']);
  assert.deepEqual(personalAttendance(records, 'missing'), []);
});
