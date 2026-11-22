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
  DEFAULT_QR_TTL_SECONDS,
  createSessionChallenge,
  generateCryptoToken,
  hashQrToken,
  revokeSessionChallenges,
  verifySessionChallenge,
} = loadTsModule('src/server/attendance/qr-challenge.ts');

// --- Helper Mock Firestore untuk Unit Test Server ---
function createMockFirestore() {
  const collections = new Map();

  function getCol(name) {
    if (!collections.has(name)) collections.set(name, new Map());
    return collections.get(name);
  }

  return {
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
          };
        },
        where(field, op, value) {
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
          const queryObj = {
            where(f, o, v) {
              docs = docs.filter((d) => {
                const val = d.data()[f];
                return o === '==' ? val === v : true;
              });
              return queryObj;
            },
            get: async () => {
              const filtered = docs.filter((d) => {
                const val = d.data()[field];
                return op === '==' ? val === value : true;
              });
              return {
                empty: filtered.length === 0,
                size: filtered.length,
                docs: filtered,
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
        commit: async () => {
          for (const op of ops) await op();
        },
      };
    },
  };
}

// --- D-03: Token Generation & SHA-256 Hashing ---
test('D-03: generateCryptoToken produces cryptographically unguessable base64url tokens', () => {
  const token1 = generateCryptoToken();
  const token2 = generateCryptoToken();

  assert.equal(typeof token1, 'string');
  assert.ok(token1.length >= 32);
  assert.notEqual(token1, token2);
  // Base64url characters only
  assert.match(token1, /^[A-Za-z0-9_-]+$/);
});

test('D-03: hashQrToken computes correct and consistent SHA-256 hex hashes', () => {
  const token = 'sample-secret-token-123';
  const hash1 = hashQrToken(token);
  const hash2 = hashQrToken(token);

  assert.equal(hash1, hash2);
  assert.equal(hash1.length, 64);
  assert.match(hash1, /^[a-f0-9]{64}$/);

  // Raw token must never equal hash
  assert.notEqual(hash1, token);

  // Different tokens yield different hashes
  assert.notEqual(hashQrToken('token-a'), hashQrToken('token-b'));
});

// --- D-03: Challenge Lifecycle & Rotation ---
test('D-03: createSessionChallenge stores hash only and sets TTL properly', async () => {
  const mockDb = createMockFirestore();
  const sessionId = 'session-mobile-1';

  const result = await createSessionChallenge(mockDb, sessionId, DEFAULT_QR_TTL_SECONDS);

  assert.equal(result.qr.version, 1);
  assert.equal(result.qr.sessionId, sessionId);
  assert.ok(result.qr.challengeId);
  assert.ok(result.qr.token);
  assert.equal(result.ttlSeconds, 60);

  // Verifikasi penyimpanan di Firestore: token mentah TIDAK disimpan
  const storedSnap = await mockDb.collection('attendanceChallenges').doc(result.qr.challengeId).get();
  assert.ok(storedSnap.exists);
  const storedData = storedSnap.data();

  assert.equal(storedData.status, 'active');
  assert.equal(storedData.sessionId, sessionId);
  assert.equal(storedData.tokenHash, hashQrToken(result.qr.token));
  assert.equal(storedData.token, undefined); // Token mentah tidak tersimpan
  assert.ok(new Date(storedData.expiresAt).getTime() > Date.now());
});

test('D-03: issuing a new challenge rotates and revokes previous active challenge', async () => {
  const mockDb = createMockFirestore();
  const sessionId = 'session-mobile-1';

  // Tantangan pertama
  const first = await createSessionChallenge(mockDb, sessionId, 60);
  const firstDocBefore = await mockDb.collection('attendanceChallenges').doc(first.qr.challengeId).get();
  assert.equal(firstDocBefore.data().status, 'active');

  // Tantangan kedua (rotasi otomatis)
  const second = await createSessionChallenge(mockDb, sessionId, 60);
  assert.notEqual(second.qr.challengeId, first.qr.challengeId);

  // Tantangan pertama harus berstatus 'revoked'
  const firstDocAfter = await mockDb.collection('attendanceChallenges').doc(first.qr.challengeId).get();
  assert.equal(firstDocAfter.data().status, 'revoked');

  // Tantangan kedua aktif
  const secondDoc = await mockDb.collection('attendanceChallenges').doc(second.qr.challengeId).get();
  assert.equal(secondDoc.data().status, 'active');
});

test('D-03: revokeSessionChallenges revokes all active challenges on session close', async () => {
  const mockDb = createMockFirestore();
  const sessionId = 'session-to-close';

  const res = await createSessionChallenge(mockDb, sessionId, 60);
  const revokedCount = await revokeSessionChallenges(mockDb, sessionId);

  assert.equal(revokedCount, 1);
  const docSnap = await mockDb.collection('attendanceChallenges').doc(res.qr.challengeId).get();
  assert.equal(docSnap.data().status, 'revoked');
});

// --- D-03: QR Verification Logic ---
test('D-03: verifySessionChallenge accepts valid matching active QR token', async () => {
  const mockDb = createMockFirestore();
  const sessionId = 'session-valid';

  const { qr } = await createSessionChallenge(mockDb, sessionId, 60);
  const verifyResult = await verifySessionChallenge(mockDb, sessionId, qr.challengeId, qr.token);

  assert.equal(verifyResult.valid, true);
  assert.ok(verifyResult.challenge);
});

test('D-03: verifySessionChallenge rejects expired, revoked, wrong session, or tampered token', async () => {
  const mockDb = createMockFirestore();
  const sessionId = 'session-verify-test';

  const { qr } = await createSessionChallenge(mockDb, sessionId, 60);

  // 1. Token salah/tampered
  const wrongTokenRes = await verifySessionChallenge(mockDb, sessionId, qr.challengeId, 'tampered-token');
  assert.equal(wrongTokenRes.valid, false);
  assert.equal(wrongTokenRes.code, 'QR_INVALID');

  // 2. Sesi lain
  const wrongSessionRes = await verifySessionChallenge(mockDb, 'other-session', qr.challengeId, qr.token);
  assert.equal(wrongSessionRes.valid, false);
  assert.equal(wrongSessionRes.code, 'QR_INVALID');

  // 3. Challenge ID tidak dikenal
  const unknownChallengeRes = await verifySessionChallenge(mockDb, sessionId, 'unknown-id', qr.token);
  assert.equal(unknownChallengeRes.valid, false);
  assert.equal(unknownChallengeRes.code, 'QR_INVALID');

  // 4. Challenge dicabut (revoked)
  await revokeSessionChallenges(mockDb, sessionId);
  const revokedRes = await verifySessionChallenge(mockDb, sessionId, qr.challengeId, qr.token);
  assert.equal(revokedRes.valid, false);
  assert.equal(revokedRes.code, 'QR_EXPIRED');

  // 5. Challenge expired (kedaluwarsa waktu)
  const expiredDb = createMockFirestore();
  const expRes = await createSessionChallenge(expiredDb, 'session-expired', -10); // TTL negatif -> expired
  const expiredCheck = await verifySessionChallenge(expiredDb, 'session-expired', expRes.qr.challengeId, expRes.qr.token);
  assert.equal(expiredCheck.valid, false);
  assert.equal(expiredCheck.code, 'QR_EXPIRED');
});

// --- D-03: Session Close + Challenge Revocation ---
test('D-03: revokeSessionChallenges returns 0 when no active challenges exist', async () => {
  const mockDb = createMockFirestore();
  const count = await revokeSessionChallenges(mockDb, 'nonexistent-session');
  assert.equal(count, 0);
});

test('D-03: revokeSessionChallenges revokes multiple active challenges', async () => {
  const mockDb = createMockFirestore();
  const sessionId = 'session-multi-revoke';

  // Buat 3 challenge secara berurutan (rotasi otomatis)
  await createSessionChallenge(mockDb, sessionId, 300);
  await createSessionChallenge(mockDb, sessionId, 300);
  const last = await createSessionChallenge(mockDb, sessionId, 300);

  // Hanya challenge terakhir yang aktif setelah rotasi
  const revokedCount = await revokeSessionChallenges(mockDb, sessionId);
  assert.equal(revokedCount, 1);

  // Verifikasi challenge terakhir juga sudah dicabut
  const docSnap = await mockDb.collection('attendanceChallenges').doc(last.qr.challengeId).get();
  assert.equal(docSnap.data().status, 'revoked');
});

test('D-03: verification fails after session challenges are revoked', async () => {
  const mockDb = createMockFirestore();
  const sessionId = 'session-verify-after-revoke';

  const { qr } = await createSessionChallenge(mockDb, sessionId, 60);

  // Verifikasi berhasil sebelum revoke
  const beforeRevoke = await verifySessionChallenge(mockDb, sessionId, qr.challengeId, qr.token);
  assert.equal(beforeRevoke.valid, true);

  // Cabut semua challenge
  await revokeSessionChallenges(mockDb, sessionId);

  // Verifikasi gagal setelah revoke
  const afterRevoke = await verifySessionChallenge(mockDb, sessionId, qr.challengeId, qr.token);
  assert.equal(afterRevoke.valid, false);
  assert.equal(afterRevoke.code, 'QR_EXPIRED');
});

test('D-03: challenge from one session cannot be used in another session', async () => {
  const mockDb = createMockFirestore();

  const { qr: qrA } = await createSessionChallenge(mockDb, 'session-a', 60);
  await createSessionChallenge(mockDb, 'session-b', 60);

  // Token dari session-a dicoba di session-b
  const crossResult = await verifySessionChallenge(mockDb, 'session-b', qrA.challengeId, qrA.token);
  assert.equal(crossResult.valid, false);
  assert.equal(crossResult.code, 'QR_INVALID');
});

test('D-03: empty or missing challengeId/token returns QR_INVALID', async () => {
  const mockDb = createMockFirestore();

  const r1 = await verifySessionChallenge(mockDb, 'session-x', '', 'some-token');
  assert.equal(r1.valid, false);
  assert.equal(r1.code, 'QR_INVALID');

  const r2 = await verifySessionChallenge(mockDb, 'session-x', 'some-id', '');
  assert.equal(r2.valid, false);
  assert.equal(r2.code, 'QR_INVALID');
});

test('D-03: QR payload structure matches contract', async () => {
  const mockDb = createMockFirestore();
  const result = await createSessionChallenge(mockDb, 'session-contract', 45);

  // Verifikasi struktur payload sesuai kontrak
  assert.equal(result.qr.version, 1);
  assert.equal(typeof result.qr.sessionId, 'string');
  assert.equal(typeof result.qr.challengeId, 'string');
  assert.equal(typeof result.qr.token, 'string');
  assert.equal(typeof result.expiresAt, 'string');
  assert.equal(result.ttlSeconds, 45);

  // expiresAt harus ISO-8601 valid
  const expiresDate = new Date(result.expiresAt);
  assert.ok(!isNaN(expiresDate.getTime()), 'expiresAt harus ISO-8601 valid');

  // Token harus base64url
  assert.match(result.qr.token, /^[A-Za-z0-9_-]+$/);
});
