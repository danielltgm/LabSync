import crypto from 'node:crypto';
import type { Firestore } from 'firebase-admin/firestore';

import type { AttendanceQrPayload } from '@/types/sprint3';

export const DEFAULT_QR_TTL_SECONDS = 60;

export interface StoredAttendanceChallenge {
  challengeId: string;
  sessionId: string;
  tokenHash: string;
  createdAt: string;
  expiresAt: string;
  status: 'active' | 'revoked';
  ttlSeconds: number;
}

export interface IssueChallengeResult {
  qr: AttendanceQrPayload;
  expiresAt: string;
  ttlSeconds: number;
}

export interface VerifyChallengeResult {
  valid: boolean;
  code?: 'QR_INVALID' | 'QR_EXPIRED';
  message?: string;
  challenge?: StoredAttendanceChallenge;
}

/**
 * Menghasilkan token acak kriptografis berbasis base64url yang aman dan tidak dapat ditebak (D-03).
 */
export function generateCryptoToken(): string {
  return crypto.randomBytes(32).toString('base64url');
}

/**
 * Melakukan hashing SHA-256 terhadap token QR sebelum disimpan di server.
 * Token mentah tidak pernah disimpan di database atau log.
 */
export function hashQrToken(token: string): string {
  return crypto.createHash('sha256').update(token.trim()).digest('hex');
}

/**
 * Menerbitkan QR presensi baru dan merotasi/mencabut QR lama untuk sesi tersebut (D-03).
 */
export async function createSessionChallenge(
  db: Firestore,
  sessionId: string,
  ttlSeconds = DEFAULT_QR_TTL_SECONDS
): Promise<IssueChallengeResult> {
  const cleanSessionId = sessionId.trim();
  const challengeId = crypto.randomUUID();
  const rawToken = generateCryptoToken();
  const tokenHash = hashQrToken(rawToken);

  const now = new Date();
  const expiresAt = new Date(now.getTime() + ttlSeconds * 1000).toISOString();

  // Cari challenge aktif sebelumnya untuk sesi ini dan batalkan (rotasi)
  const activeChallengesSnap = await db
    .collection('attendanceChallenges')
    .where('sessionId', '==', cleanSessionId)
    .where('status', '==', 'active')
    .get();

  const batch = db.batch();

  for (const docSnap of activeChallengesSnap.docs) {
    batch.update(docSnap.ref, {
      status: 'revoked',
      revokedAt: now.toISOString(),
    });
  }

  const newChallengeRef = db.collection('attendanceChallenges').doc(challengeId);
  batch.set(newChallengeRef, {
    challengeId,
    sessionId: cleanSessionId,
    tokenHash,
    createdAt: now.toISOString(),
    expiresAt,
    status: 'active',
    ttlSeconds,
  });

  await batch.commit();

  return {
    qr: {
      version: 1,
      sessionId: cleanSessionId,
      challengeId,
      token: rawToken,
    },
    expiresAt,
    ttlSeconds,
  };
}

/**
 * Membatalkan semua tantangan QR aktif saat sesi ditutup (D-03).
 */
export async function revokeSessionChallenges(
  db: Firestore,
  sessionId: string
): Promise<number> {
  const cleanSessionId = sessionId.trim();
  const activeChallengesSnap = await db
    .collection('attendanceChallenges')
    .where('sessionId', '==', cleanSessionId)
    .where('status', '==', 'active')
    .get();

  if (activeChallengesSnap.empty) return 0;

  const batch = db.batch();
  const nowIso = new Date().toISOString();

  for (const docSnap of activeChallengesSnap.docs) {
    batch.update(docSnap.ref, {
      status: 'revoked',
      revokedAt: nowIso,
    });
  }

  await batch.commit();
  return activeChallengesSnap.size;
}

/**
 * Memvalidasi apakah token QR, challengeId, dan sessionId cocok dan masih berlaku (D-03, D-05).
 */
export async function verifySessionChallenge(
  db: Firestore,
  sessionId: string,
  challengeId: string,
  rawToken: string
): Promise<VerifyChallengeResult> {
  if (!challengeId?.trim() || !rawToken?.trim()) {
    return {
      valid: false,
      code: 'QR_INVALID',
      message: 'Parameter QR challengeId atau token tidak lengkap.',
    };
  }

  const docRef = db.collection('attendanceChallenges').doc(challengeId.trim());
  const snap = await docRef.get();

  if (!snap.exists) {
    return {
      valid: false,
      code: 'QR_INVALID',
      message: 'Kode QR tidak dikenali oleh sistem presensi.',
    };
  }

  const challenge = snap.data() as StoredAttendanceChallenge;

  if (challenge.sessionId !== sessionId.trim()) {
    return {
      valid: false,
      code: 'QR_INVALID',
      message: 'Kode QR bukan milik sesi praktikum ini.',
    };
  }

  if (challenge.status !== 'active') {
    return {
      valid: false,
      code: 'QR_EXPIRED',
      message: 'Kode QR telah dicabut atau diganti dengan kode terbaru.',
    };
  }

  const now = new Date();
  const expiration = new Date(challenge.expiresAt);
  if (now.getTime() > expiration.getTime()) {
    return {
      valid: false,
      code: 'QR_EXPIRED',
      message: 'Kode QR telah kedaluwarsa. Silakan pindai QR terbaru asisten.',
    };
  }

  const expectedHash = hashQrToken(rawToken);
  if (expectedHash !== challenge.tokenHash) {
    return {
      valid: false,
      code: 'QR_INVALID',
      message: 'Token QR tidak cocok dengan rahasia sesi server.',
    };
  }

  return {
    valid: true,
    challenge,
  };
}
