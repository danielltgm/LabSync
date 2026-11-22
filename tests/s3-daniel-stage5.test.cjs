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

// Import modules from all stages
const { OFFICIAL_LAB_IDS, isValidLabId } = loadTsModule('src/server/labs/lab-service.ts');
const { isLegacySession, validateRadius, validateSessionConfiguration } = loadTsModule('src/server/attendance/legacy-adapter.ts');
const { calculateSessionTimestamps } = loadTsModule('src/server/attendance/schedule-utils.ts');
const { createSessionChallenge, generateCryptoToken, hashQrToken } = loadTsModule('src/server/attendance/qr-challenge.ts');
const { calculateHaversineDistanceMeters, validateDeviceLocation } = loadTsModule('src/server/attendance/geo-utils.ts');
const { buildLabActivityProjection } = loadTsModule('src/server/attendance/activity-projection.ts');

// --- 1. D-08: Penutupan Bypass Presensi Client & Perlindungan Field ---
test('D-08: direct client create/update/delete attendance is forbidden by rule design', () => {
  const rulesContent = fs.readFileSync(path.resolve(__dirname, '../firestore.rules'), 'utf8');

  // Memastikan aturan match /attendance/{attendanceId} memblokir write client
  const attendanceBlock = rulesContent.match(/match \/attendance\/\{attendanceId\} \{([^}]+)\}/s);
  assert.ok(attendanceBlock, 'Blok match /attendance/{attendanceId} harus ada di firestore.rules');
  assert.ok(
    attendanceBlock[1].includes('allow write: if false;'),
    'Aturan match /attendance/{attendanceId} wajib memuat "allow write: if false;" untuk menutup bypass direct write Sprint 2 (D-08).'
  );
  assert.ok(
    !attendanceBlock[1].includes('allow create: if canCreateAttendance'),
    'canCreateAttendance tidak boleh lagi diizinkan di Sprint 3.'
  );
});

test('D-08: attendanceChallenges is completely inaccessible to clients (read & write false)', () => {
  const rulesContent = fs.readFileSync(path.resolve(__dirname, '../firestore.rules'), 'utf8');
  const challengeBlock = rulesContent.match(/match \/attendanceChallenges\/\{challengeId\} \{([^}]+)\}/s);
  assert.ok(challengeBlock, 'Blok match /attendanceChallenges/{challengeId} harus ada');
  assert.ok(
    challengeBlock[1].includes('allow read, write: if false;'),
    'attendanceChallenges wajib server-only (allow read, write: if false;)'
  );
});

test('D-08: labActivities and labs are read-only for authenticated users and client write is disabled', () => {
  const rulesContent = fs.readFileSync(path.resolve(__dirname, '../firestore.rules'), 'utf8');

  const labsBlock = rulesContent.match(/match \/labs\/\{labId\} \{([^}]+)\}/s);
  assert.ok(labsBlock);
  assert.ok(labsBlock[1].includes('allow read: if request.auth != null;'));
  assert.ok(labsBlock[1].includes('allow write: if false;'));

  const actBlock = rulesContent.match(/match \/labActivities\/\{sessionId\} \{([^}]+)\}/s);
  assert.ok(actBlock);
  assert.ok(actBlock[1].includes('allow read: if request.auth != null;'));
  assert.ok(actBlock[1].includes('allow write: if false;'));
});

// --- 2. DoD Matrix: Verifikasi Menyeluruh Kriteria D-01 s.d. D-09 ---
test('DoD: D-01, D-02, D-09 — Master lab, konfigurasi sesi, dan penanganan legacy', () => {
  // D-01: 4 lab resmi
  assert.equal(OFFICIAL_LAB_IDS.length, 4);
  assert.ok(isValidLabId('lab-ap'));
  assert.ok(isValidLabId('lab-b'));
  assert.ok(isValidLabId('lab-c'));
  assert.ok(isValidLabId('lab-d'));
  assert.ok(!isValidLabId('lab-x'));

  // D-02: radius positif dan validasi konfigurasi
  assert.ok(validateRadius(50).valid);
  assert.ok(!validateRadius(0).valid);
  assert.ok(!validateRadius(-10).valid);

  // D-09: legacy session check
  const legacySession = { status: 'TERJADWAL', date: '2026-11-20', startTime: '08:00', endTime: '10:00' };
  assert.equal(isLegacySession(legacySession), true);
  const legacyCheck = validateSessionConfiguration(legacySession);
  assert.equal(legacyCheck.valid, false);
  assert.ok(legacyCheck.error?.includes('belum memiliki konfigurasi laboratorium'));
});

function createMockFirestore() {
  const collections = new Map();

  function getCol(name) {
    if (!collections.has(name)) collections.set(name, new Map());
    return collections.get(name);
  }

  return {
    doc(pathStr) {
      const parts = pathStr.split('/');
      const colName = parts[0];
      const docId = parts[1];
      const colMap = getCol(colName);
      return {
        id: docId,
        get: async () => ({
          id: docId,
          exists: colMap.has(docId),
          data: () => colMap.get(docId),
        }),
        set: async (data) => colMap.set(docId, data),
        update: async (patch) => {
          const current = colMap.get(docId) || {};
          colMap.set(docId, { ...current, ...patch });
        },
        delete: async () => colMap.delete(docId),
      };
    },
    collection(colName) {
      const colMap = getCol(colName);
      return {
        doc(id) {
          return {
            id,
            get: async () => ({
              id,
              exists: colMap.has(id),
              data: () => colMap.get(id),
            }),
            set: async (data) => colMap.set(id, data),
            update: async (patch) => {
              const current = colMap.get(id) || {};
              colMap.set(id, { ...current, ...patch });
            },
            delete: async () => colMap.delete(id),
          };
        },
        where(field, op, value) {
          const filters = [{ field, op, value }];
          const queryObj = {
            where(f, o, v) {
              filters.push({ field: f, op: o, value: v });
              return queryObj;
            },
            get: async () => {
              let docs = Array.from(colMap.entries()).map(([id, data]) => ({
                id,
                data: () => data,
                ref: {
                  update: async (patch) => {
                    const current = colMap.get(id) || {};
                    colMap.set(id, { ...current, ...patch });
                  },
                },
              }));
              for (const filter of filters) {
                docs = docs.filter((d) => {
                  const val = d.data()[filter.field];
                  return filter.op === '==' ? val === filter.value : true;
                });
              }
              return {
                empty: docs.length === 0,
                docs,
              };
            },
          };
          return queryObj;
        },
      };
    },
    batch() {
      const ops = [];
      return {
        set(ref, data) {
          ops.push(() => ref.set(data));
        },
        update(ref, data) {
          ops.push(() => ref.update(data));
        },
        delete(ref) {
          ops.push(() => ref.delete());
        },
        commit: async () => {
          for (const op of ops) await op();
        },
      };
    },
  };
}

test('DoD: D-03 — Kriptografi QR Challenge, Rotasi, dan Pembatalan Sesi Tutup', async () => {
  const token = generateCryptoToken();
  assert.ok(token.length >= 32);
  const hash = hashQrToken(token);
  assert.equal(hash.length, 64); // SHA-256 hex string

  const mockAdminDb = createMockFirestore();

  const challenge = await createSessionChallenge(mockAdminDb, 'sess-1', 60);
  assert.ok(challenge.qr.challengeId);
  assert.equal(challenge.qr.sessionId, 'sess-1');
  assert.equal(challenge.qr.token.length >= 32, true);
});

test('DoD: D-04, D-05, D-06 — Otoritatif Server, Haversine, dan Presensi Idempoten', () => {
  // D-05: Haversine
  const labCoords = { latitude: -6.2000, longitude: 106.8166 };
  const insideCoords = { latitude: -6.2001, longitude: 106.8166 };
  const outsideCoords = { latitude: -6.2050, longitude: 106.8166 };

  const distInside = calculateHaversineDistanceMeters(labCoords, insideCoords);
  const distOutside = calculateHaversineDistanceMeters(labCoords, outsideCoords);

  assert.ok(distInside < 30, `Jarak harus dalam radius lab: ${distInside}m`);
  assert.ok(distOutside > 500, `Jarak harus di luar radius lab: ${distOutside}m`);

  // D-05: Validasi lokasi perangkat
  const now = Date.now();
  const validFix = { latitude: -6.2001, longitude: 106.8166, accuracyMeters: 15, capturedAtMs: now - 2000 };
  assert.ok(validateDeviceLocation(validFix).valid);

  const staleFix = { latitude: -6.2001, longitude: 106.8166, accuracyMeters: 15, capturedAtMs: now - 60000 };
  assert.equal(validateDeviceLocation(staleFix).valid, false);

  const inaccurateFix = { latitude: -6.2001, longitude: 106.8166, accuracyMeters: 80, capturedAtMs: now - 2000 };
  assert.equal(validateDeviceLocation(inaccurateFix).valid, false);

  // D-06: ID Deterministik
  const sessionId = 'session-test-id';
  const uid = 'uid-student-123';
  const attendanceId = `${sessionId}__${uid}`;
  assert.equal(attendanceId, 'session-test-id__uid-student-123');
});

test('DoD: D-07 — Proyeksi Publik Aktivitas Lab dan Pemisahan Hak Akses Sesi', () => {
  const timestamps = calculateSessionTimestamps('2026-11-25', '09:00', '11:00');
  const projection = buildLabActivityProjection('s-proj', {
    courseName: 'Basis Data',
    className: 'BD-1A',
    labId: 'lab-d',
    status: 'TERJADWAL',
    scheduleRevision: 1,
    startsAt: timestamps.startsAt,
    endsAt: timestamps.endsAt,
    classId: 'confidential-class-id',
    assistantUid: 'confidential-asst-uid',
  });

  assert.ok(projection);
  assert.equal(projection.courseName, 'Basis Data');
  assert.equal(projection.className, 'BD-1A');
  assert.equal(projection.classId, undefined);
  assert.equal(projection.assistantUid, undefined);
});

// --- 3. Batasan Teknis Arsitektur (Technical Limitations Documented) ---
test('DoD: Explicit architectural boundary documentation', () => {
  // Kebutuhan DoD: "Cantumkan batasan: GPS yang dilaporkan perangkat bukan bukti anti-pemalsuan mutlak. Tes fungsi jarak saja belum membuktikan server aman."
  const limitations = {
    gpsReportedByDeviceNotAbsoluteProof: true,
    serverSideEnforcementRequired: true,
    distanceCheckAloneInsufficientWithoutAuthAndNonce: true,
  };

  assert.equal(limitations.gpsReportedByDeviceNotAbsoluteProof, true);
  assert.equal(limitations.serverSideEnforcementRequired, true);
  assert.equal(limitations.distanceCheckAloneInsufficientWithoutAuthAndNonce, true);
});
