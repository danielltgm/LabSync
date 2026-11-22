const assert = require('node:assert/strict');
const { test } = require('node:test');

const {
  DEFAULT_LOCATION_POLICY,
  validateDeviceLocationFix,
} = require('../src/services/attendance/location-validator.ts');

const NOW = 1_790_000_000_000;

test('accepts fresh, accurate, finite GPS fix', () => {
  const res = validateDeviceLocationFix(
    { latitude: 0, longitude: 0, accuracyMeters: 12, capturedAtMs: NOW - 5_000 },
    DEFAULT_LOCATION_POLICY,
    NOW,
  );
  assert.equal(res.ok, true);
});

test('rejects invalid coordinates, stale fixes, future skew, and poor accuracy', () => {
  const badCoord = validateDeviceLocationFix(
    { latitude: 95, longitude: 0, accuracyMeters: 10, capturedAtMs: NOW },
    DEFAULT_LOCATION_POLICY,
    NOW,
  );
  assert.equal(badCoord.ok, false);
  if (!badCoord.ok) assert.equal(badCoord.code, 'LOCATION_INVALID');

  const futureSkew = validateDeviceLocationFix(
    { latitude: 0, longitude: 0, accuracyMeters: 10, capturedAtMs: NOW + 10_000 },
    DEFAULT_LOCATION_POLICY,
    NOW,
  );
  assert.equal(futureSkew.ok, false);
  if (!futureSkew.ok) assert.equal(futureSkew.code, 'LOCATION_INVALID');

  const stale = validateDeviceLocationFix(
    { latitude: 0, longitude: 0, accuracyMeters: 10, capturedAtMs: NOW - 45_000 },
    DEFAULT_LOCATION_POLICY,
    NOW,
  );
  assert.equal(stale.ok, false);
  if (!stale.ok) assert.equal(stale.code, 'LOCATION_STALE');

  const inaccurate = validateDeviceLocationFix(
    { latitude: 0, longitude: 0, accuracyMeters: 50, capturedAtMs: NOW - 2_000 },
    DEFAULT_LOCATION_POLICY,
    NOW,
  );
  assert.equal(inaccurate.ok, false);
  if (!inaccurate.ok) assert.equal(inaccurate.code, 'LOCATION_INACCURATE');
});
