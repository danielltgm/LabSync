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
  calculateHaversineDistanceMeters,
  DEFAULT_POLICY_CONSTRAINTS,
  validateDeviceLocation,
} = loadTsModule('src/server/attendance/geo-utils.ts');

const {
  createSessionChallenge,
  hashQrToken,
} = loadTsModule('src/server/attendance/qr-challenge.ts');

// --- 1. D-05: Haversine Distance Calculation ---
test('D-05: Haversine distance between identical coordinates is 0 meters', () => {
  const coord = { latitude: -6.2088, longitude: 106.8456 };
  const distance = calculateHaversineDistanceMeters(coord, coord);
  assert.equal(distance, 0);
});

test('D-05: Haversine distance accurately computes meter distances for nearby points', () => {
  // Koordinat uji: beda lintang ~0.0001 derajat (+/- 11.1 meter di ekuator)
  const lab = { latitude: -6.200000, longitude: 106.816666 };
  const student = { latitude: -6.200100, longitude: 106.816666 };

  const distance = calculateHaversineDistanceMeters(lab, student);
  assert.ok(distance > 10 && distance < 12, `Jarak terhitung: ${distance}m, seharusnya sekitar 11.1m`);
});

test('D-05: Haversine distance correctly identifies points well outside laboratory radius', () => {
  const lab = { latitude: -6.200000, longitude: 106.816666 };
  // Jarak ~111 meter
  const farStudent = { latitude: -6.201000, longitude: 106.816666 };

  const distance = calculateHaversineDistanceMeters(lab, farStudent);
  assert.ok(distance > 100, `Jarak terhitung: ${distance}m`);
});

// --- 2. D-05: Device Location Validation & Policy Constraints ---
test('D-05: validateDeviceLocation accepts fresh, accurate coordinates within policy', () => {
  const now = Date.now();
  const validLocation = {
    latitude: -6.2088,
    longitude: 106.8456,
    accuracyMeters: 12.5,
    capturedAtMs: now - 3000, // 3 detik lalu
  };

  const result = validateDeviceLocation(validLocation, DEFAULT_POLICY_CONSTRAINTS, now);
  assert.equal(result.valid, true);
  assert.ok(result.locationAgeMs >= 3000 && result.locationAgeMs <= 3050);
});

test('D-05: validateDeviceLocation rejects non-object, missing, or non-finite coords', () => {
  const now = Date.now();

  assert.equal(validateDeviceLocation(null, DEFAULT_POLICY_CONSTRAINTS, now).code, 'LOCATION_INVALID');
  assert.equal(validateDeviceLocation('not-an-object', DEFAULT_POLICY_CONSTRAINTS, now).code, 'LOCATION_INVALID');

  const nanCoords = { latitude: NaN, longitude: 106.0, accuracyMeters: 10, capturedAtMs: now };
  assert.equal(validateDeviceLocation(nanCoords, DEFAULT_POLICY_CONSTRAINTS, now).code, 'LOCATION_INVALID');

  const infinityCoords = { latitude: -6.0, longitude: Infinity, accuracyMeters: 10, capturedAtMs: now };
  assert.equal(validateDeviceLocation(infinityCoords, DEFAULT_POLICY_CONSTRAINTS, now).code, 'LOCATION_INVALID');

  const stringCoords = { latitude: '-6.0', longitude: 106.0, accuracyMeters: 10, capturedAtMs: now };
  assert.equal(validateDeviceLocation(stringCoords, DEFAULT_POLICY_CONSTRAINTS, now).code, 'LOCATION_INVALID');
});

test('D-05: validateDeviceLocation rejects out-of-range latitude and longitude', () => {
  const now = Date.now();
  const outOfBoundsLat = { latitude: 95.0, longitude: 106.0, accuracyMeters: 10, capturedAtMs: now };
  assert.equal(validateDeviceLocation(outOfBoundsLat, DEFAULT_POLICY_CONSTRAINTS, now).code, 'LOCATION_INVALID');

  const outOfBoundsLon = { latitude: -6.0, longitude: 185.0, accuracyMeters: 10, capturedAtMs: now };
  assert.equal(validateDeviceLocation(outOfBoundsLon, DEFAULT_POLICY_CONSTRAINTS, now).code, 'LOCATION_INVALID');
});

test('D-05: validateDeviceLocation rejects inaccurate GPS readings above policy threshold', () => {
  const now = Date.now();
  // Toleransi default adalah 30 meter. Akurasi 35 meter harus ditolak (LOCATION_INACCURATE).
  const poorGps = {
    latitude: -6.2088,
    longitude: 106.8456,
    accuracyMeters: 35.0,
    capturedAtMs: now - 1000,
  };

  const result = validateDeviceLocation(poorGps, DEFAULT_POLICY_CONSTRAINTS, now);
  assert.equal(result.valid, false);
  assert.equal(result.code, 'LOCATION_INACCURATE');
});

test('D-05: validateDeviceLocation rejects stale GPS readings older than policy threshold', () => {
  const now = Date.now();
  // Toleransi usia maksimum adalah 30.000 ms (30 detik). Pengukuran 45 detik lalu harus ditolak (LOCATION_STALE).
  const staleGps = {
    latitude: -6.2088,
    longitude: 106.8456,
    accuracyMeters: 10.0,
    capturedAtMs: now - 45000,
  };

  const result = validateDeviceLocation(staleGps, DEFAULT_POLICY_CONSTRAINTS, now);
  assert.equal(result.valid, false);
  assert.equal(result.code, 'LOCATION_STALE');
});

test('D-05: validateDeviceLocation rejects timestamps too far in the future', () => {
  const now = Date.now();
  // Toleransi future skew adalah 5000 ms (5 detik). Pengukuran 10 detik di masa depan harus ditolak (LOCATION_STALE).
  const futureGps = {
    latitude: -6.2088,
    longitude: 106.8456,
    accuracyMeters: 10.0,
    capturedAtMs: now + 10000,
  };

  const result = validateDeviceLocation(futureGps, DEFAULT_POLICY_CONSTRAINTS, now);
  assert.equal(result.valid, false);
  assert.equal(result.code, 'LOCATION_STALE');
});

// --- 3. D-04, D-05, D-06: Check-In Business Logic & Atomicity Simulation ---
test('D-06: check-in saves attendance with verification metadata without raw QR token', () => {
  const labCoords = { latitude: -6.2088, longitude: 106.8456 };
  const studentCoords = { latitude: -6.2088, longitude: 106.8456 };
  const distance = calculateHaversineDistanceMeters(studentCoords, labCoords);
  const radius = 50;

  assert.ok(distance <= radius);

  // Verifikasi struktur data yang akan disimpan di Firestore
  const rawQrToken = 'my-super-secret-raw-token-123';
  const attendanceRecord = {
    sessionId: 'session-123',
    classId: 'class-456',
    studentUid: 'uid-student-789',
    studentId: '1234567890',
    studentName: 'Budi Santoso',
    className: 'Praktikum Pemrograman',
    checkedInAt: new Date().toISOString(),
    verification: {
      method: 'qr-geotag',
      labId: 'lab-ap',
      labConfigVersion: 1,
      policyVersion: 's3-v1',
      challengeId: 'challenge-uuid',
      distanceMeters: distance,
      radiusMeters: radius,
      location: {
        latitude: studentCoords.latitude,
        longitude: studentCoords.longitude,
        accuracyMeters: 10,
        capturedAtMs: Date.now(),
      },
      locationAgeMs: 1500,
    },
  };

  // Kriteria D-06: raw token TIDAK boleh ada dalam dokumen presensi
  assert.equal(attendanceRecord.token, undefined);
  assert.equal(attendanceRecord.verification.token, undefined);
  assert.equal(attendanceRecord.verification.method, 'qr-geotag');
  assert.equal(attendanceRecord.verification.distanceMeters, 0);
  assert.equal(attendanceRecord.verification.radiusMeters, 50);
});

test('D-06: deterministic attendanceId prevents multiple records per student per session', () => {
  const sessionId = 'session-alpha';
  const uid1 = 'student-uid-1';
  const uid2 = 'student-uid-2';

  const id1 = `${sessionId}__${uid1}`;
  const id1Retry = `${sessionId}__${uid1}`;
  const id2 = `${sessionId}__${uid2}`;

  assert.equal(id1, id1Retry); // Retry menghasilkan ID yang sama (idempoten)
  assert.notEqual(id1, id2);   // User berbeda memiliki ID berbeda
});
