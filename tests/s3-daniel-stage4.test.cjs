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
  buildLabActivityProjection,
  deleteLabActivity,
  extractTimestampMillis,
  resolveCurrentAndNextActivities,
  syncLabActivity,
} = loadTsModule('src/server/attendance/activity-projection.ts');

const { calculateSessionTimestamps } = loadTsModule('src/server/attendance/schedule-utils.ts');

// --- 1. D-07: Sanitasi dan Filter Informasi Privat ---
test('D-07: buildLabActivityProjection extracts only allowed fields and filters out private session data', () => {
  const timestamps = calculateSessionTimestamps('2026-11-25', '09:00', '11:00');
  const sensitiveSession = {
    classId: 'class-mobile-private-123',
    assistantUid: 'uid-asisten-rahasia-456',
    assistantName: 'Budi Asisten',
    courseName: 'Praktikum Pemrograman Mobile',
    className: 'IF-3B',
    labRoom: 'Ruang 301',
    date: '2026-11-25',
    startTime: '09:00',
    endTime: '11:00',
    status: 'TERJADWAL',
    labId: 'lab-b',
    radiusMeters: 45,
    scheduleRevision: 2,
    startsAt: timestamps.startsAt,
    endsAt: timestamps.endsAt,
    attendanceConfig: {
      labId: 'lab-b',
      coordinates: { latitude: -6.2, longitude: 106.8 },
      radiusMeters: 45,
      labConfigVersion: 1,
      policyVersion: 's3-v1',
    },
    // Data privat/ekstra yang tidak boleh bocor:
    studentUid: 'student-789',
    studentList: ['student-1', 'student-2'],
    leaveRequests: ['leave-1'],
    notes: 'Catatan internal asisten',
  };

  const projection = buildLabActivityProjection('session-clean-1', sensitiveSession);

  assert.ok(projection !== null, 'Proyeksi harus berhasil dibuat');
  assert.equal(projection.sessionId, 'session-clean-1');
  assert.equal(projection.labId, 'lab-b');
  assert.equal(projection.courseName, 'Praktikum Pemrograman Mobile');
  assert.equal(projection.className, 'IF-3B');
  assert.equal(projection.status, 'TERJADWAL');
  assert.equal(projection.scheduleRevision, 2);
  assert.deepEqual(projection.startsAt, timestamps.startsAt);
  assert.deepEqual(projection.endsAt, timestamps.endsAt);

  // Verifikasi tegas tidak ada field sensitif
  const allowedKeys = new Set([
    'sessionId',
    'labId',
    'courseName',
    'className',
    'startsAt',
    'endsAt',
    'status',
    'scheduleRevision',
  ]);

  for (const key of Object.keys(projection)) {
    assert.ok(
      allowedKeys.has(key),
      `Field sensitif/tidak diizinkan "${key}" tidak boleh bocor ke dalam proyeksi publik!`
    );
  }

  assert.equal(projection.classId, undefined);
  assert.equal(projection.assistantUid, undefined);
  assert.equal(projection.assistantName, undefined);
  assert.equal(projection.studentUid, undefined);
  assert.equal(projection.attendanceConfig, undefined);
  assert.equal(projection.notes, undefined);
});

// --- 2. D-07: Penanganan Sesi Belum Dikonfigurasi / Invalid ---
test('D-07: buildLabActivityProjection returns null when labId is missing or invalid', () => {
  const timestamps = calculateSessionTimestamps('2026-11-25', '09:00', '11:00');
  const validBase = {
    courseName: 'Basis Data',
    className: 'BD-1A',
    startsAt: timestamps.startsAt,
    endsAt: timestamps.endsAt,
    status: 'TERJADWAL',
  };

  assert.equal(buildLabActivityProjection('s-1', { ...validBase, labId: undefined }), null);
  assert.equal(buildLabActivityProjection('s-1', { ...validBase, labId: null }), null);
  assert.equal(buildLabActivityProjection('s-1', { ...validBase, labId: 'lab-unknown' }), null);
  assert.equal(buildLabActivityProjection('s-1', { ...validBase, labId: 'lab-e' }), null);
});

test('D-07: buildLabActivityProjection computes timestamps from date/startTime/endTime when startsAt/endsAt not provided', () => {
  const sessionWithoutTimestamps = {
    courseName: 'Jaringan Komputer',
    className: 'JK-2A',
    date: '2026-11-25',
    startTime: '13:00',
    endTime: '15:00',
    labId: 'lab-c',
    status: 'TERJADWAL',
  };

  const projection = buildLabActivityProjection('s-auto-ts', sessionWithoutTimestamps);
  assert.ok(projection !== null);
  assert.equal(projection.labId, 'lab-c');
  assert.ok(projection.startsAt !== undefined);
  assert.ok(projection.endsAt !== undefined);
});

test('D-07: buildLabActivityProjection returns null when schedule timestamps cannot be resolved', () => {
  const invalidSession = {
    courseName: 'Jaringan Komputer',
    className: 'JK-2A',
    labId: 'lab-c',
    status: 'TERJADWAL',
  };

  assert.equal(buildLabActivityProjection('s-no-ts', invalidSession), null);
});

// --- 3. D-07: Penanganan Event Tidak Berurutan (Out-of-Order Events) ---
test('D-07: syncLabActivity updates projection and ignores stale out-of-order events with lower scheduleRevision', async () => {
  const mockStorage = new Map();

  const mockAdminDb = {
    doc: (docPath) => ({
      get: async () => {
        const val = mockStorage.get(docPath);
        return {
          exists: val !== undefined,
          data: () => val,
        };
      },
      set: async (data) => {
        mockStorage.set(docPath, data);
      },
      delete: async () => {
        mockStorage.delete(docPath);
      },
    }),
  };

  const timestamps = calculateSessionTimestamps('2026-11-25', '09:00', '11:00');

  // Event 1: Simpan sesi revisi 2
  const sessionRev2 = {
    courseName: 'Sistem Operasi',
    className: 'SO-1',
    labId: 'lab-ap',
    status: 'TERJADWAL',
    scheduleRevision: 2,
    startsAt: timestamps.startsAt,
    endsAt: timestamps.endsAt,
  };

  const res1 = await syncLabActivity(mockAdminDb, 'session-so', sessionRev2);
  assert.equal(res1.synced, true);
  assert.equal(mockStorage.get('labActivities/session-so').scheduleRevision, 2);

  // Event 2: Datang event terlambat (stale) dengan revisi 1 (misal dari jaringan lambat)
  const staleSessionRev1 = {
    courseName: 'Sistem Operasi Lama',
    className: 'SO-1-Lama',
    labId: 'lab-ap',
    status: 'TERJADWAL',
    scheduleRevision: 1,
    startsAt: timestamps.startsAt,
    endsAt: timestamps.endsAt,
  };

  const res2 = await syncLabActivity(mockAdminDb, 'session-so', staleSessionRev1);
  assert.equal(res2.synced, false, 'Event kadaluwarsa tidak boleh menimpa revisi baru');
  assert.equal(res2.reason, 'OUTDATED_REVISION');

  // Pastikan data di storage tetap versi revisi 2
  const currentInDb = mockStorage.get('labActivities/session-so');
  assert.equal(currentInDb.scheduleRevision, 2);
  assert.equal(currentInDb.courseName, 'Sistem Operasi');

  // Event 3: Datang event revisi 3 (harus berhasil memperbarui)
  const newerSessionRev3 = {
    courseName: 'Sistem Operasi Terkini',
    className: 'SO-1',
    labId: 'lab-ap',
    status: 'DIBUKA',
    scheduleRevision: 3,
    startsAt: timestamps.startsAt,
    endsAt: timestamps.endsAt,
  };

  const res3 = await syncLabActivity(mockAdminDb, 'session-so', newerSessionRev3);
  assert.equal(res3.synced, true);
  assert.equal(mockStorage.get('labActivities/session-so').scheduleRevision, 3);
  assert.equal(mockStorage.get('labActivities/session-so').status, 'DIBUKA');
});

// --- 4. D-07: Penghapusan Sesi Menghapus Proyeksi ---
test('D-07: deleteLabActivity successfully removes the projection document', async () => {
  const mockStorage = new Map();
  mockStorage.set('labActivities/session-to-delete', { courseName: 'Test' });

  const mockAdminDb = {
    doc: (docPath) => ({
      delete: async () => {
        mockStorage.delete(docPath);
      },
    }),
  };

  assert.equal(mockStorage.has('labActivities/session-to-delete'), true);
  const deleted = await deleteLabActivity(mockAdminDb, 'session-to-delete');
  assert.equal(deleted, true);
  assert.equal(mockStorage.has('labActivities/session-to-delete'), false);
});

// --- 5. D-07 & Y-04: Resolusi Aktivitas Sekarang dan Berikutnya ---
test('D-07 & Y-04: resolveCurrentAndNextActivities correctly filters and sorts active & upcoming sessions', () => {
  // Simulasi waktu "sekarang" = 2026-11-25 10:00:00 WIB (UTC = 03:00:00)
  const nowMs = Date.UTC(2026, 10, 25, 3, 0, 0, 0); // 10:00 WIB

  const createMockTs = (jakartaHour, jakartaMinute) => {
    const millis = Date.UTC(2026, 10, 25, jakartaHour - 7, jakartaMinute, 0, 0);
    return {
      toMillis: () => millis,
      seconds: Math.floor(millis / 1000),
      nanoseconds: 0,
    };
  };

  // Aktivitas 1: 09:00 - 11:00 (Sedang Berjalan - TERJADWAL/DIBUKA)
  const actCurrent1 = {
    sessionId: 'session-curr-1',
    labId: 'lab-ap',
    courseName: 'Pemrograman Web',
    className: 'PW-1',
    startsAt: createMockTs(9, 0),
    endsAt: createMockTs(11, 0),
    status: 'DIBUKA',
    scheduleRevision: 1,
  };

  // Aktivitas 2: 09:30 - 11:30 (Sedang Berjalan bertumpuk)
  const actCurrent2 = {
    sessionId: 'session-curr-2',
    labId: 'lab-ap',
    courseName: 'Struktur Data',
    className: 'SD-1',
    startsAt: createMockTs(9, 30),
    endsAt: createMockTs(11, 30),
    status: 'TERJADWAL',
    scheduleRevision: 1,
  };

  // Aktivitas 3: 08:00 - 09:59 (Sudah selesai sebelum jam 10:00)
  const actPast = {
    sessionId: 'session-past',
    labId: 'lab-ap',
    courseName: 'Algoritma',
    className: 'AL-1',
    startsAt: createMockTs(8, 0),
    endsAt: createMockTs(9, 59),
    status: 'SELESAI',
    scheduleRevision: 1,
  };

  // Aktivitas 4: 09:00 - 11:00 tapi sudah berstatus SELESAI lebih awal
  const actCurrentFinished = {
    sessionId: 'session-curr-done',
    labId: 'lab-ap',
    courseName: 'Kecerdasan Buatan',
    className: 'AI-1',
    startsAt: createMockTs(9, 0),
    endsAt: createMockTs(11, 0),
    status: 'SELESAI',
    scheduleRevision: 1,
  };

  // Aktivitas 5: 11:30 - 13:30 (Aktivitas Berikutnya 1)
  const actNext1 = {
    sessionId: 'session-next-1',
    labId: 'lab-ap',
    courseName: 'Jaringan Komputer',
    className: 'JK-1',
    startsAt: createMockTs(11, 30),
    endsAt: createMockTs(13, 30),
    status: 'TERJADWAL',
    scheduleRevision: 1,
  };

  // Aktivitas 6: 14:00 - 16:00 (Aktivitas Berikutnya 2)
  const actNext2 = {
    sessionId: 'session-next-2',
    labId: 'lab-ap',
    courseName: 'Keamanan Siber',
    className: 'KS-1',
    startsAt: createMockTs(14, 0),
    endsAt: createMockTs(16, 0),
    status: 'TERJADWAL',
    scheduleRevision: 1,
  };

  const allActivities = [
    actNext2,
    actCurrent2,
    actPast,
    actNext1,
    actCurrentFinished,
    actCurrent1,
  ];

  const resolved = resolveCurrentAndNextActivities(allActivities, nowMs);

  // 1. Aktivitas Sekarang harus mencakup actCurrent1 dan actCurrent2, tapi TIDAK actCurrentFinished atau actPast
  assert.equal(resolved.currentActivities.length, 2);
  assert.equal(resolved.currentActivities[0].sessionId, 'session-curr-1'); // 09:00
  assert.equal(resolved.currentActivities[1].sessionId, 'session-curr-2'); // 09:30

  // 2. Aktivitas Berikutnya harus mencakup actNext1 dan actNext2, terurut berdasarkan startsAt
  assert.equal(resolved.nextActivities.length, 2);
  assert.equal(resolved.nextActivities[0].sessionId, 'session-next-1'); // 11:30
  assert.equal(resolved.nextActivities[1].sessionId, 'session-next-2'); // 14:00
});

test('D-07: extractTimestampMillis handles various Firestore Timestamp representations', () => {
  const millis = 1795000000000;
  assert.equal(extractTimestampMillis({ toMillis: () => millis }), millis);
  assert.equal(extractTimestampMillis({ toDate: () => new Date(millis) }), millis);
  assert.equal(extractTimestampMillis({ seconds: 1795000000, nanoseconds: 0 }), millis);
  assert.equal(extractTimestampMillis(millis), millis);
  assert.equal(extractTimestampMillis(null), 0);
  assert.equal(extractTimestampMillis(undefined), 0);
});
