const assert = require('node:assert/strict');
const { test } = require('node:test');

const { submitAttendanceCheckIn } = require('../src/services/attendance/check-in-client.ts');
const {
  buildCheckInRequest,
  resolveCheckInUrl,
} = require('../src/services/attendance/check-in-request.ts');

const syntheticRequest = buildCheckInRequest({
  sessionId: 'sess-01',
  qr: { version: 1, sessionId: 'sess-01', challengeId: 'SYNTHETIC-CH', token: 'SYNTHETIC-TOK' },
  location: { latitude: 0, longitude: 0, accuracyMeters: 10, capturedAtMs: 1_790_000_000_000 },
  notes: '  PC-14  ',
});

test('builds CheckInRequest without student UID/NIM and resolves endpoint URL', () => {
  assert.deepEqual(Object.keys(syntheticRequest).sort(), ['challengeId', 'location', 'notes', 'sessionId', 'token']);
  assert.equal(syntheticRequest.notes, 'PC-14');
  assert.equal(resolveCheckInUrl('https://api.labsync.example/'), 'https://api.labsync.example/api/attendance/check-in');
  assert.equal(resolveCheckInUrl(''), null);
});

test('sends Bearer token and handles recorded, already-recorded, server-error, and network-error', async () => {
  let capturedAuth = '';
  const okRes = await submitAttendanceCheckIn(syntheticRequest, {
    endpointUrl: 'https://api.labsync.example/api/attendance/check-in',
    getIdToken: async () => 'SYNTHETIC-ID-TOKEN',
    fetchImpl: async (_url, init) => {
      capturedAuth = init.headers.Authorization;
      return {
        ok: true,
        status: 200,
        json: async () => ({
          status: 'recorded',
          attendanceId: 'sess-01__uid-1',
          checkedInAt: '2026-11-20T01:15:00.000Z',
          distanceMeters: 8,
          radiusMeters: 30,
        }),
      };
    },
  });
  assert.equal(capturedAuth, 'Bearer SYNTHETIC-ID-TOKEN');
  assert.equal(okRes.kind, 'success');
  if (okRes.kind === 'success') assert.equal(okRes.data.status, 'recorded');

  const outsideRes = await submitAttendanceCheckIn(syntheticRequest, {
    endpointUrl: 'https://api.labsync.example/api/attendance/check-in',
    getIdToken: async () => 'SYNTHETIC-ID-TOKEN',
    fetchImpl: async () => ({
      ok: false,
      status: 422,
      json: async () => ({ error: { code: 'OUTSIDE_RADIUS', message: 'Di luar radius.' } }),
    }),
  });
  assert.equal(outsideRes.kind, 'server-error');
  if (outsideRes.kind === 'server-error') assert.equal(outsideRes.code, 'OUTSIDE_RADIUS');

  const netRes = await submitAttendanceCheckIn(syntheticRequest, {
    endpointUrl: 'https://api.labsync.example/api/attendance/check-in',
    getIdToken: async () => 'SYNTHETIC-ID-TOKEN',
    fetchImpl: async () => {
      throw new Error('ECONNRESET');
    },
  });
  assert.equal(netRes.kind, 'network-error');
});
