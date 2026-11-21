const assert = require('node:assert/strict');
const { test } = require('node:test');

const {
  buildAttendanceRecordId,
  dedupeAttendanceRecords,
  hasSessionAttendance,
  reconcileOwnAttendance,
  toLiveAttendanceFromCheckIn,
} = require('../src/services/attendance/recap-sync.ts');
const { personalAttendance } = require('../src/utils/attendance-view.ts');

test('builds deterministic Sprint 2 attendance ID and maps CheckInResult to Jakarta time without leaking coordinates', () => {
  assert.equal(buildAttendanceRecordId('session-01', 'uid-praktikan'), 'session-01__uid-praktikan');

  const record = toLiveAttendanceFromCheckIn({
    result: {
      status: 'recorded',
      attendanceId: 'session-01__uid-praktikan',
      checkedInAt: '2026-11-20T02:15:30.000Z',
      distanceMeters: 8.4,
      radiusMeters: 30,
    },
    sessionId: 'session-01',
    studentUid: 'uid-praktikan',
    studentId: '24060123130001',
    studentName: 'Agiel Praktikan',
    className: 'IF-A',
    notes: '  PC-07  ',
  });

  assert.equal(record.id, 'session-01__uid-praktikan');
  assert.equal(record.sessionId, 'session-01');
  assert.equal(record.studentUid, 'uid-praktikan');
  assert.equal(record.studentId, '24060123130001');
  assert.equal(record.studentName, 'Agiel Praktikan');
  assert.equal(record.className, 'IF-A');
  assert.equal(record.notes, 'PC-07');
  assert.equal(record.checkInTime, '09:15:30');
  assert.equal('latitude' in record, false);
  assert.equal('distanceMeters' in record, false);

  const ownHistory = personalAttendance([record], 'uid-praktikan');
  assert.equal(ownHistory.length, 1);
  assert.equal(ownHistory[0].id, 'session-01__uid-praktikan');
});

test('deduplicates repeated or retried check-ins using deterministic sessionId__uid key', () => {
  const pendingFromClient = {
    id: 'session-01__uid-praktikan',
    sessionId: 'session-01',
    studentUid: 'uid-praktikan',
    studentId: '24060123130001',
    studentName: 'Agiel Praktikan',
    className: 'IF-A',
    checkedInAtMillis: null,
    checkInTime: 'Menunggu sinkronisasi',
  };

  const committedFromServer = toLiveAttendanceFromCheckIn({
    result: {
      status: 'already-recorded',
      attendanceId: 'session-01__uid-praktikan',
      checkedInAt: '2026-11-20T02:15:30.000Z',
      distanceMeters: 8.4,
      radiusMeters: 30,
    },
    sessionId: 'session-01',
    studentUid: 'uid-praktikan',
    studentId: '24060123130001',
    studentName: 'Agiel Praktikan',
    className: 'IF-A',
  });

  const otherStudent = {
    id: 'session-01__uid-lain',
    sessionId: 'session-01',
    studentUid: 'uid-lain',
    studentId: '24060123130002',
    studentName: 'Praktikan Lain',
    className: 'IF-A',
    checkedInAtMillis: Date.parse('2026-11-20T02:16:00.000Z'),
    checkInTime: '09:16:00',
  };

  const deduped = dedupeAttendanceRecords([
    pendingFromClient,
    committedFromServer,
    committedFromServer,
    otherStudent,
  ]);

  assert.equal(deduped.length, 2);
  const own = deduped.find((item) => item.studentUid === 'uid-praktikan');
  assert.equal(own?.id, 'session-01__uid-praktikan');
  assert.equal(own?.checkInTime, '09:15:30');
  assert.equal(hasSessionAttendance(deduped, 'session-01', 'uid-praktikan'), true);
  assert.equal(hasSessionAttendance(deduped, 'session-99', 'uid-praktikan'), false);

  const reconciled = reconcileOwnAttendance(pendingFromClient, committedFromServer);
  assert.equal(reconciled?.id, 'session-01__uid-praktikan');
  assert.equal(reconciled?.checkInTime, '09:15:30');
});
