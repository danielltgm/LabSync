/* global __dirname */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const ts = require('typescript');

const moduleCache = new Map();

function loadTsModule(moduleRelativePath) {
  const cleanPath = moduleRelativePath.replace(/\\/g, '/');
  if (moduleCache.has(cleanPath)) {
    return moduleCache.get(cleanPath);
  }

  const filePath = path.resolve(__dirname, '..', cleanPath);
  const source = fs.readFileSync(filePath, 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
  }).outputText;

  const customModule = { exports: {} };
  moduleCache.set(cleanPath, customModule.exports);

  const customRequire = (specifier) => {
    if (specifier.startsWith('@/')) {
      const rel = specifier.slice(2);
      const candidates = [
        path.join('src', rel + '.ts'),
        path.join('src', rel + '.tsx'),
        path.join('src', rel, 'index.ts'),
        path.join('src', rel),
      ];
      for (const candidate of candidates) {
        if (fs.existsSync(path.resolve(__dirname, '..', candidate))) {
          return loadTsModule(candidate);
        }
      }
    }
    if (specifier.startsWith('.')) {
      const dir = path.dirname(cleanPath);
      const candidates = [
        path.join(dir, specifier + '.ts'),
        path.join(dir, specifier + '.tsx'),
        path.join(dir, specifier, 'index.ts'),
        path.join(dir, specifier),
      ];
      for (const candidate of candidates) {
        if (fs.existsSync(path.resolve(__dirname, '..', candidate))) {
          return loadTsModule(candidate);
        }
      }
    }
    return require(specifier);
  };

  new Function('require', 'exports', 'module', compiled)(
    customRequire,
    customModule.exports,
    customModule
  );

  return customModule.exports;
}

const {
  OFFICIAL_LAB_IDS,
  OFFICIAL_LAB_NAMES,
  isValidCoordinates,
  isValidLabId,
  validateLabConfiguration,
} = loadTsModule('src/server/labs/lab-service.ts');

const {
  calculateSessionTimestamps,
  jakartaDateTimeToMillis,
  jakartaDateTimeToTimestamp,
} = loadTsModule('src/server/attendance/schedule-utils.ts');

const {
  createAttendanceConfigSnapshot,
  isLegacySession,
  validateRadius,
  validateSessionConfiguration,
} = loadTsModule('src/server/attendance/legacy-adapter.ts');

const { validateSessionInput } = loadTsModule('src/services/sessionService.ts');

// --- D-01: Master Lab Master Validations ---
test('D-01: official lab IDs and names strictly match specifications', () => {
  assert.deepEqual(OFFICIAL_LAB_IDS, ['lab-ap', 'lab-b', 'lab-c', 'lab-d']);
  assert.equal(OFFICIAL_LAB_NAMES['lab-ap'], 'LAB AP');
  assert.equal(OFFICIAL_LAB_NAMES['lab-b'], 'LAB B');
  assert.equal(OFFICIAL_LAB_NAMES['lab-c'], 'LAB C');
  assert.equal(OFFICIAL_LAB_NAMES['lab-d'], 'LAB D');

  assert.equal(isValidLabId('lab-ap'), true);
  assert.equal(isValidLabId('lab-b'), true);
  assert.equal(isValidLabId('lab-c'), true);
  assert.equal(isValidLabId('lab-d'), true);
  assert.equal(isValidLabId('lab-other'), false);
  assert.equal(isValidLabId(''), false);
  assert.equal(isValidLabId(null), false);
});

test('D-01: coordinates validation checks geographic limits and finite numbers', () => {
  assert.equal(isValidCoordinates({ latitude: -6.2088, longitude: 106.8456 }), true);
  assert.equal(isValidCoordinates({ latitude: 0, longitude: 0 }), true);
  assert.equal(isValidCoordinates({ latitude: -90, longitude: 180 }), true);

  // Invalid coordinates
  assert.equal(isValidCoordinates(null), false);
  assert.equal(isValidCoordinates({ latitude: 91, longitude: 100 }), false);
  assert.equal(isValidCoordinates({ latitude: -6, longitude: 181 }), false);
  assert.equal(isValidCoordinates({ latitude: NaN, longitude: 100 }), false);
  assert.equal(isValidCoordinates({ latitude: -6, longitude: Infinity }), false);
  assert.equal(isValidCoordinates({ latitude: '-6', longitude: 106 }), false);
});

test('D-01: unconfigured labs must remain disabled when coordinates are null', () => {
  const validUnconfigured = {
    id: 'lab-ap',
    name: 'LAB AP',
    coordinates: null,
    enabled: false,
    configVersion: 1,
  };
  assert.deepEqual(validateLabConfiguration(validUnconfigured), { valid: true });

  const invalidEnabledWithoutCoords = {
    ...validUnconfigured,
    enabled: true,
  };
  const res = validateLabConfiguration(invalidEnabledWithoutCoords);
  assert.equal(res.valid, false);
  assert.match(res.error, /tidak boleh aktif jika koordinat bernilai null/);
});

// --- D-02 & Schedule Utils: Timezone and Timestamps in Asia/Jakarta ---
test('D-02: schedule timestamps compute correctly for Asia/Jakarta (UTC+7)', () => {
  const millis = jakartaDateTimeToMillis('2026-11-20', '08:00');
  // 2026-11-20 08:00 WIB (UTC+7) = 2026-11-20 01:00 UTC
  const expectedUtc = Date.UTC(2026, 10, 20, 1, 0, 0, 0);
  assert.equal(millis, expectedUtc);

  const timestamp = jakartaDateTimeToTimestamp('2026-11-20', '08:00');
  assert.equal(timestamp.toMillis(), expectedUtc);

  const sessionTimestamps = calculateSessionTimestamps('2026-11-20', '08:00', '10:00');
  assert.equal(sessionTimestamps.endsAtMillis - sessionTimestamps.startsAtMillis, 2 * 60 * 60 * 1000);
  assert.ok(sessionTimestamps.endsAtMillis > sessionTimestamps.startsAtMillis);

  // End time before or equal to start time must throw
  assert.throws(
    () => calculateSessionTimestamps('2026-11-20', '10:00', '08:00'),
    /Jam selesai sesi praktikum harus setelah jam mulai/
  );
  assert.throws(
    () => calculateSessionTimestamps('2026-11-20', '08:00', '08:00'),
    /Jam selesai sesi praktikum harus setelah jam mulai/
  );
});

// --- D-02: Radius Validation and Configuration ---
test('D-02: radius must be finite positive number in meters', () => {
  assert.deepEqual(validateRadius(50), { valid: true });
  assert.deepEqual(validateRadius(10.5), { valid: true });

  for (const invalid of [0, -10, NaN, Infinity, -Infinity, null, undefined, '50']) {
    const check = validateRadius(invalid);
    assert.equal(check.valid, false);
    assert.match(check.error, /angka positif finit/);
  }
});

// --- D-09: Legacy Session Handling without Fabricated Data ---
test('D-09: legacy sessions are identified without fabricating dummy geotag', () => {
  const legacySession = {
    classId: 'class-1',
    courseName: 'Mobile',
    className: 'IF-3A',
    labRoom: 'Lab RPL',
    date: '2026-11-20',
    startTime: '08:00',
    endTime: '10:00',
    status: 'TERJADWAL',
  };

  assert.equal(isLegacySession(legacySession), true);

  // Validating a legacy session for opening must fail and require assistant configuration
  const check = validateSessionConfiguration(legacySession);
  assert.equal(check.valid, false);
  assert.match(check.error, /belum memiliki konfigurasi laboratorium/);

  // Session with labId but missing radius
  const withLabOnly = { ...legacySession, labId: 'lab-ap' };
  const check2 = validateSessionConfiguration(withLabOnly);
  assert.equal(check2.valid, false);
  assert.match(check2.error, /angka positif finit/);

  // Fully configured session passes
  const configured = { ...legacySession, labId: 'lab-ap', radiusMeters: 30 };
  assert.deepEqual(validateSessionConfiguration(configured), { valid: true });
});

test('D-02 & D-09: snapshot creation requires active lab with valid coordinates', () => {
  const unconfiguredLab = {
    id: 'lab-ap',
    name: 'LAB AP',
    coordinates: null,
    enabled: false,
    configVersion: 1,
  };

  assert.throws(
    () => createAttendanceConfigSnapshot(unconfiguredLab, 50),
    /belum aktif atau belum memiliki koordinat resmi/
  );

  const activeLab = {
    id: 'lab-ap',
    name: 'LAB AP',
    coordinates: { latitude: -6.2, longitude: 106.8 },
    enabled: true,
    configVersion: 2,
  };

  const snapshot = createAttendanceConfigSnapshot(activeLab, 50, 's3-v1');
  assert.deepEqual(snapshot, {
    labId: 'lab-ap',
    coordinates: { latitude: -6.2, longitude: 106.8 },
    labConfigVersion: 2,
    radiusMeters: 50,
    policyVersion: 's3-v1',
  });
});

// --- SessionInput Validation in Service ---
test('D-02: validateSessionInput handles optional Sprint 3 fields correctly', () => {
  const baseInput = {
    classId: 'class-1',
    courseName: 'Pemrograman Mobile',
    className: 'IF-3A',
    labRoom: 'Lab RPL',
    date: '2026-11-20',
    startTime: '08:00',
    endTime: '10:00',
    assistantName: 'Asisten Demo',
  };

  // Valid Sprint 2-only input
  assert.equal(validateSessionInput(baseInput), null);

  // Valid Sprint 3 input
  assert.equal(validateSessionInput({ ...baseInput, labId: 'lab-ap', radiusMeters: 40 }), null);

  // Invalid labId
  assert.match(
    validateSessionInput({ ...baseInput, labId: 'lab-invalid' }),
    /Pilihan laboratorium "lab-invalid" tidak valid/
  );

  // Invalid radius
  assert.match(
    validateSessionInput({ ...baseInput, labId: 'lab-ap', radiusMeters: -5 }),
    /angka positif finit/
  );
});
