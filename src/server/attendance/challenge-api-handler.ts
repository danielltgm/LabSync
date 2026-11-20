import fs from 'node:fs';
import path from 'node:path';

import { getAdminApp, getAuth, getFirestore } from '@/server/firebase-admin';

import {
  createSessionChallenge,
  DEFAULT_QR_TTL_SECONDS,
} from './qr-challenge';

const headers = {
  'Content-Type': 'application/json',
  'Cache-Control': 'private, no-store, no-cache',
};

function errorResponse(status: number, code: string, message: string) {
  return Response.json(
    {
      error: {
        code,
        message,
      },
    },
    { status, headers }
  );
}

function getPolicyTtl(): number {
  try {
    const policyPath = path.resolve(process.cwd(), 'config', 'sprint3-policy.json');
    if (fs.existsSync(policyPath)) {
      const content = JSON.parse(fs.readFileSync(policyPath, 'utf8'));
      if (typeof content.qrTtlSeconds === 'number' && content.qrTtlSeconds > 0) {
        return content.qrTtlSeconds;
      }
    }
  } catch {
    // Gunakan default jika file tidak dapat dibaca
  }
  return DEFAULT_QR_TTL_SECONDS;
}

export async function handleAttendanceChallengesRequest(request: Request): Promise<Response> {
  if (request.method !== 'POST') {
    return errorResponse(405, 'METHOD_NOT_ALLOWED', 'Metode permintaan harus POST.');
  }

  // 1. Ekstraksi Bearer token dari header Authorization
  const authHeader = request.headers.get('authorization') ?? request.headers.get('Authorization');
  const tokenMatch = authHeader?.match(/^Bearer (\S+)$/i);
  const idToken = tokenMatch?.[1];

  if (!idToken) {
    return errorResponse(401, 'AUTH_REQUIRED', 'Header Authorization: Bearer <token> wajib disertakan.');
  }

  // 2. Inisialisasi Firebase Admin
  const app = getAdminApp();
  if (!app) {
    return errorResponse(503, 'SERVICE_UNAVAILABLE', 'Layanan database server tidak tersedia.');
  }

  // 3. Verifikasi ID Token Firebase
  let uid: string;
  try {
    const auth = getAuth(app);
    const decoded = await auth.verifyIdToken(idToken);
    uid = decoded.uid;
  } catch {
    return errorResponse(401, 'AUTH_REQUIRED', 'Sesi login tidak valid atau telah kedaluwarsa. Silakan masuk kembali.');
  }

  // 4. Parse request body
  let body: { sessionId?: string };
  try {
    body = (await request.json()) as { sessionId?: string };
  } catch {
    return errorResponse(400, 'BAD_REQUEST', 'Body permintaan harus berupa format JSON yang valid.');
  }

  const sessionId = body?.sessionId?.trim();
  if (!sessionId) {
    return errorResponse(400, 'BAD_REQUEST', 'Parameter "sessionId" wajib diisi.');
  }

  try {
    const db = getFirestore(app);

    // 5. Ambil data sesi
    const sessionRef = db.doc(`sessions/${sessionId}`);
    const sessionSnap = await sessionRef.get();

    if (!sessionSnap.exists) {
      return errorResponse(404, 'SESSION_NOT_FOUND', `Sesi praktikum dengan ID "${sessionId}" tidak ditemukan.`);
    }

    const sessionData = sessionSnap.data() as Record<string, unknown>;
    const classId = String(sessionData.classId ?? '');

    // 6. Verifikasi status sesi harus DIBUKA
    if (sessionData.status !== 'DIBUKA') {
      return errorResponse(
        409,
        'SESSION_CLOSED',
        `Sesi praktikum saat ini berstatus "${sessionData.status}". QR hanya dapat diterbitkan saat sesi DIBUKA.`
      );
    }

    // 7. Verifikasi kelengkapan konfigurasi laboratorium
    if (!sessionData.attendanceConfig) {
      return errorResponse(
        409,
        'LAB_NOT_CONFIGURED',
        'Sesi praktikum belum memiliki konfigurasi laboratorium atau snapshot kebijakan presensi.'
      );
    }

    // 8. Verifikasi hak asisten pengampu kelas
    const [classSnap, userSnap] = await db.getAll(
      db.doc(`classes/${classId}`),
      db.doc(`users/${uid}`)
    );

    const isClassOwner = classSnap.exists && classSnap.get('assistantUid') === uid;
    const isAssistant = userSnap.exists && userSnap.get('role') === 'ASISTEN';

    if (!isClassOwner || !isAssistant) {
      return errorResponse(
        403,
        'FORBIDDEN',
        'Akses ditolak. Hanya asisten pengampu kelas yang berhak menerbitkan QR presensi.'
      );
    }

    // 9. Dapatkan TTL dari kebijakan dan terbitkan challenge baru
    const ttlSeconds = getPolicyTtl();
    const result = await createSessionChallenge(db, sessionId, ttlSeconds);

    return Response.json(result, { status: 200, headers });
  } catch (err: unknown) {
    const message = (err as Error)?.message ?? 'Terjadi kesalahan internal server.';
    return errorResponse(500, 'INTERNAL_ERROR', message);
  }
}
