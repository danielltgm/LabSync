const assert = require('node:assert/strict');
const { test } = require('node:test');

const { parseAttendanceQrPayload } = require('../src/services/attendance/qr-validator.ts');

test('accepts valid LabSync v1 QR payload matching current session', () => {
  const raw = JSON.stringify({
    version: 1,
    sessionId: 'sess-01',
    challengeId: 'SYNTHETIC-CH-01',
    token: 'SYNTHETIC-TOK-01',
  });
  const res = parseAttendanceQrPayload(raw, 'sess-01');
  assert.equal(res.ok, true);
  if (res.ok) {
    assert.equal(res.payload.challengeId, 'SYNTHETIC-CH-01');
    assert.equal(res.payload.token, 'SYNTHETIC-TOK-01');
  }
});

test('rejects empty, malformed, unsupported version, and wrong-session QR payloads', () => {
  const empty = parseAttendanceQrPayload('   ', 'sess-01');
  assert.equal(empty.ok, false);
  if (!empty.ok) assert.equal(empty.code, 'EMPTY_QR');

  const malformed = parseAttendanceQrPayload('https://example.com', 'sess-01');
  assert.equal(malformed.ok, false);
  if (!malformed.ok) assert.equal(malformed.code, 'INVALID_FORMAT');

  const wrongVer = parseAttendanceQrPayload(
    JSON.stringify({ version: 2, sessionId: 'sess-01', challengeId: 'c1', token: 't1' }),
    'sess-01',
  );
  assert.equal(wrongVer.ok, false);
  if (!wrongVer.ok) assert.equal(wrongVer.code, 'UNSUPPORTED_VERSION');

  const wrongSess = parseAttendanceQrPayload(
    JSON.stringify({ version: 1, sessionId: 'sess-99', challengeId: 'c1', token: 't1' }),
    'sess-01',
  );
  assert.equal(wrongSess.ok, false);
  if (!wrongSess.ok) assert.equal(wrongSess.code, 'WRONG_SESSION');
});
