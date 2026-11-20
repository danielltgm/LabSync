import { getAdminApp, getAuth, getFirestore } from '@/server/firebase-admin';

import { revokeSessionChallenges } from './qr-challenge';

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

/**
 * API handler untuk menutup sesi praktikum (DIBUKA → SELESAI)
 * dan mencabut semua challenge QR aktif secara server-side (D-03).
 */
export async function handleCloseSessionRequest(request: Request): Promise<Response> {
  if (request.method !== 'POST') {
    return errorResponse(405, 'METHOD_NOT_ALLOWED', 'Metode permintaan harus POST.');
  }

  // 1. Ekstraksi Bearer token
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
        `Sesi praktikum berstatus "${sessionData.status}", hanya sesi DIBUKA yang dapat ditutup.`
      );
    }

    // 7. Verifikasi hak asisten pengampu kelas
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
        'Akses ditolak. Hanya asisten pengampu kelas yang berhak menutup sesi praktikum.'
      );
    }

    // 8. Update status sesi → SELESAI
    await sessionRef.update({ status: 'SELESAI' });

    // 9. Cabut semua challenge QR aktif
    const revokedCount = await revokeSessionChallenges(db, sessionId);

    return Response.json(
      {
        status: 'closed',
        sessionId,
        revokedChallenges: revokedCount,
      },
      { status: 200, headers }
    );
  } catch (err: unknown) {
    const message = (err as Error)?.message ?? 'Terjadi kesalahan internal server.';
    return errorResponse(500, 'INTERNAL_ERROR', message);
  }
}
