const assert = require('node:assert/strict');
const { test } = require('node:test');

const { buildPresensiSessionMeta } = require('../src/services/attendance/session-view.ts');

const baseSession = {
  id: 'sess-01',
  classId: 'class-01',
  courseName: 'Pemrograman Mobile',
  className: 'IF-3A',
  labRoom: 'LAB AP',
  date: '2026-11-20',
  startTime: '08:00',
  endTime: '10:00',
  assistantName: 'Asisten Demo',
  status: 'DIBUKA',
};

test('formats configured Sprint 3 session with attendanceConfig snapshot', () => {
  const meta = buildPresensiSessionMeta({
    ...baseSession,
    labId: 'lab-ap',
    radiusMeters: 25,
    attendanceConfig: {
      labId: 'lab-ap',
      coordinates: { latitude: 0, longitude: 0 }, // synthetic test coordinate
      labConfigVersion: 1,
      radiusMeters: 25,
      policyVersion: 's3-v1',
    },
  });

  assert.equal(meta.labId, 'lab-ap');
  assert.equal(meta.labName, 'LAB AP');
  assert.equal(meta.radiusMeters, 25);
  assert.equal(meta.isGeotagReady, true);
});

test('marks legacy session without lab coordinates or radius as not geotag ready', () => {
  const meta = buildPresensiSessionMeta(baseSession, {
    id: 'lab-ap',
    name: 'LAB AP',
    coordinates: null,
    enabled: false,
    configVersion: 1,
  });

  assert.equal(meta.radiusMeters, null);
  assert.equal(meta.isGeotagReady, false);
});
