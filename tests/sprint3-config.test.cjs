const assert = require('node:assert/strict');
const { test } = require('node:test');
const repositoryLabs = require('../config/sprint3-labs.json');
const repositoryPolicy = require('../config/sprint3-policy.json');
// Fixed fixtures keep these tests useful after the PM fills the real config.
const labs = [
  ['lab-ap', 'LAB AP'], ['lab-b', 'LAB B'], ['lab-c', 'LAB C'], ['lab-d', 'LAB D'],
].map(([id, name]) => ({ id, name, coordinates: null, enabled: false, configVersion: 1 }));
const policy = { policyVersion: 'test-v1', timezone: 'Asia/Jakarta', demoPlatforms: [],
  qrTtlSeconds: null, maxLocationAgeMs: null, maxAccuracyMeters: null, maxFutureSkewMs: null };
const { validateLabManifest, validateSprint3Policy, sprint3ConfigurationGaps } = require('../src/utils/sprint3-config.ts');
const clone = (value) => structuredClone(value);

test('unconfigured official labs remain explicit demo blockers without fabricated coordinates', () => {
  assert.deepEqual(validateLabManifest(labs), []);
  assert.deepEqual(labs.map(({ id, name }) => [id, name]), [
    ['lab-ap', 'LAB AP'], ['lab-b', 'LAB B'], ['lab-c', 'LAB C'], ['lab-d', 'LAB D'],
  ]);
  assert.ok(labs.every((lab) => lab.coordinates === null && lab.enabled === false));
  assert.deepEqual(validateSprint3Policy(policy), []);
  assert.equal(sprint3ConfigurationGaps(labs, policy).length, 9);
});

test('a lab cannot be enabled without valid geographic coordinates', () => {
  for (const coordinates of [null, {}, { latitude: 91, longitude: 0 },
    { latitude: 0, longitude: -181 }, { latitude: NaN, longitude: 0 },
    { latitude: 0, longitude: Infinity }, { latitude: '0', longitude: 0 }]) {
    const draft = clone(labs);
    draft[0].enabled = true;
    draft[0].coordinates = coordinates;
    assert.ok(validateLabManifest(draft).length > 0);
  }
});

test('missing, duplicate, unknown and renamed labs are rejected', () => {
  assert.ok(validateLabManifest(labs.slice(1)).length);
  assert.ok(validateLabManifest([...labs, labs[0]]).length);
  assert.ok(validateLabManifest([...labs, { id: 'other' }]).length);
  const draft = clone(labs);
  draft[0].name = 'LAB A';
  assert.ok(validateLabManifest(draft).length);
});

test('malformed root, flags and configuration revisions are rejected', () => {
  for (const root of [null, {}, 'labs', [null], [12]]) assert.ok(validateLabManifest(root).length);
  for (const version of [0, -1, 1.2, Infinity, '1', undefined]) {
    const draft = clone(labs);
    draft[0].configVersion = version;
    assert.ok(validateLabManifest(draft).length);
  }
  const draft = clone(labs);
  draft[0].enabled = 'true';
  assert.ok(validateLabManifest(draft).length);
});

test('policy rejects zero or non-finite limits and unsupported platforms', () => {
  for (const field of ['qrTtlSeconds', 'maxLocationAgeMs', 'maxAccuracyMeters']) {
    for (const value of [0, -1, Infinity, NaN, '30', undefined]) {
      assert.ok(validateSprint3Policy({ ...policy, [field]: value }).length);
    }
  }
  for (const demoPlatforms of [['web'], ['android', 'android'], null]) {
    assert.ok(validateSprint3Policy({ ...policy, demoPlatforms }).length);
  }
  assert.ok(validateSprint3Policy({ ...policy, timezone: 'UTC' }).length);
  assert.ok(validateSprint3Policy({ ...policy, maxFutureSkewMs: -1 }).length);
});

test('configured synthetic fixtures clear manifest/policy gaps without claiming device readiness', () => {
  // Deliberately synthetic boundary points; never import these into the lab manifest.
  const configured = labs.map((lab) => ({ ...lab, enabled: true, coordinates: { latitude: 0, longitude: 0 } }));
  const selected = { ...policy, demoPlatforms: ['android'], qrTtlSeconds: 30,
    maxLocationAgeMs: 10000, maxAccuracyMeters: 20, maxFutureSkewMs: 0 };
  assert.deepEqual(sprint3ConfigurationGaps(configured, selected), []);
});

test('committed configuration is structurally valid before or after official values are provided', () => {
  assert.deepEqual(validateLabManifest(repositoryLabs), []);
  assert.deepEqual(validateSprint3Policy(repositoryPolicy), []);
});
