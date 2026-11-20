import fs from 'node:fs';
import path from 'node:path';

import {
  FieldValue,
  getAdminApp,
  getAuth,
  getFirestore,
} from '@/server/firebase-admin';
import type { CheckInRequest, CheckInResult, DeviceLocationFix } from '@/types/sprint3';

import {
  calculateHaversineDistanceMeters,
  DEFAULT_POLICY_CONSTRAINTS,
  type PolicyConstraints,
  validateDeviceLocation,
} from './geo-utils';
import { hashQrToken } from './qr-challenge';

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

export function loadSprint3Policy(): PolicyConstraints {
  try {
    const policyPath = path.resolve(process.cwd(), 'config', 'sprint3-policy.json');
    if (fs.existsSync(policyPath)) {
      const content = JSON.parse(fs.readFileSync(policyPath, 'utf8'));
      return {
        maxLocationAgeMs: content.maxLocationAgeMs ?? DEFAULT_POLICY_CONSTRAINTS.maxLocationAgeMs,
        maxAccuracyMeters: content.maxAccuracyMeters ?? DEFAULT_POLICY_CONSTRAINTS.maxAccuracyMeters,
        maxFutureSkewMs: content.maxFutureSkewMs ?? DEFAULT_POLICY_CONSTRAINTS.maxFutureSkewMs,
      };
    }
  } catch {
    // fallback default
  }
  return DEFAULT_POLICY_CONSTRAINTS;
}

/**
 * Handler endpoint otoritatif presensi praktikan via scan QR & validasi geotag (D-04, D-05, D-06).
 */
export async function handleAttendanceCheckInRequest(request: Request): Promise<Response> {
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

  // 3. Verifikasi ID Token Firebase (D-04)
  let uid: string;
  try {
    const auth = getAuth(app);
    const decoded = await auth.verifyIdToken(idToken);
    uid = decoded.uid;
  } catch {
    return errorResponse(401, 'AUTH_REQUIRED', 'Sesi login tidak valid atau telah kedaluwarsa. Silakan masuk kembali.');
  }

  // 4. Parse request body
  let body: CheckInRequest;
  try {
    body = (await request.json()) as CheckInRequest;
  } catch {
    return errorResponse(400, 'BAD_REQUEST', 'Body permintaan harus berupa format JSON yang valid.');
  }

  const sessionId = body?.sessionId?.trim();
  const challengeId = body?.challengeId?.trim();
  const rawToken = body?.token?.trim();
  const location = body?.location;
  const notes = typeof body?.notes === 'string' ? body.notes.trim() : undefined;

  if (!sessionId) {
    return errorResponse(400, 'BAD_REQUEST', 'Parameter "sessionId" wajib diisi.');
  }
  if (!challengeId) {
    return errorResponse(400, 'QR_INVALID', 'Parameter "challengeId" wajib disertakan.');
  }
  if (!rawToken) {
    return errorResponse(400, 'QR_INVALID', 'Token rahasia dari QR presensi wajib disertakan.');
  }
  if (notes && notes.length > 250) {
    return errorResponse(400, 'BAD_REQUEST', 'Catatan presensi melebihi batas maksimum 250 karakter.');
  }

  const db = getFirestore(app);
  const attendanceId = `${sessionId}__${uid}`;
  const attendanceRef = db.doc(`attendance/${attendanceId}`);

  try {
    // 5. Cek rekaman sendiri yang sudah tersimpan untuk retry yang aman (D-06, contract.md)
    const existingSnap = await attendanceRef.get();
    if (existingSnap.exists) {
      const existingData = existingSnap.data() as Record<string, unknown>;
      let checkedInAtIso = new Date().toISOString();
      const rawTimestamp = existingData.checkedInAt as { toDate?: () => Date } | undefined;
      if (rawTimestamp && typeof rawTimestamp.toDate === 'function') {
        checkedInAtIso = rawTimestamp.toDate().toISOString();
      }

      const verification = (existingData.verification as Record<string, unknown>) ?? {};
      const distance = Number(verification.distanceMeters ?? 0);
      const radius = Number(verification.radiusMeters ?? 0);

      const result: CheckInResult = {
        status: 'already-recorded',
        attendanceId,
        checkedInAt: checkedInAtIso,
        distanceMeters: distance,
        radiusMeters: radius,
      };
      return Response.json(result, { status: 200, headers });
    }

    // 6. Ambil profil praktikan dari server (D-04)
    const userRef = db.doc(`users/${uid}`);
    const userSnap = await userRef.get();

    if (!userSnap.exists) {
      return errorResponse(403, 'FORBIDDEN', 'Data profil pengguna tidak ditemukan di server.');
    }

    const userData = userSnap.data() as Record<string, unknown>;
    const studentRole = userData.role;
    const studentId = String(userData.identifier ?? '');
    const studentName = String(userData.name ?? '');

    if (studentRole !== 'PRAKTISAN') {
      return errorResponse(403, 'FORBIDDEN', 'Hanya pengguna dengan peran Praktikan yang dapat mencatat presensi.');
    }

    // 7. Muat policy lokasi
    const policy = loadSprint3Policy();
    const serverNowMs = Date.now();

    // Validasi struktur & toleransi lokasi perangkat
    const locationValidation = validateDeviceLocation(location, policy, serverNowMs);
    if (!locationValidation.valid) {
      const httpStatus = locationValidation.code === 'LOCATION_INVALID' ? 400 : 422;
      return errorResponse(
        httpStatus,
        locationValidation.code!,
        locationValidation.message!
      );
    }

    const cleanLocation = location as DeviceLocationFix;

    // 8. Eksekusi transaksi Firestore untuk atomisitas dan konsistensi penuh (D-05, D-06)
    const transactionResult = await db.runTransaction(async (t) => {
      // a. Cek kembali rekaman di dalam transaksi
      const inTxAttendanceSnap = await t.get(attendanceRef);
      if (inTxAttendanceSnap.exists) {
        const inTxData = inTxAttendanceSnap.data() as Record<string, unknown>;
        let inTxCheckedInAt = new Date().toISOString();
        const inTxTimestamp = inTxData.checkedInAt as { toDate?: () => Date } | undefined;
        if (inTxTimestamp && typeof inTxTimestamp.toDate === 'function') {
          inTxCheckedInAt = inTxTimestamp.toDate().toISOString();
        }
        const v = (inTxData.verification as Record<string, unknown>) ?? {};
        return {
          status: 'already-recorded' as const,
          attendanceId,
          checkedInAt: inTxCheckedInAt,
          distanceMeters: Number(v.distanceMeters ?? 0),
          radiusMeters: Number(v.radiusMeters ?? 0),
        };
      }

      // b. Ambil data sesi
      const sessionRef = db.doc(`sessions/${sessionId}`);
      const sessionSnap = await t.get(sessionRef);

      if (!sessionSnap.exists) {
        throw { status: 404, code: 'SESSION_NOT_FOUND', message: `Sesi praktikum "${sessionId}" tidak ditemukan.` };
      }

      const sessionData = sessionSnap.data() as Record<string, unknown>;
      const classId = String(sessionData.classId ?? '');
      const className = String(sessionData.className ?? '');

      if (sessionData.status !== 'DIBUKA') {
        throw {
          status: 409,
          code: 'SESSION_CLOSED',
          message: `Sesi praktikum berstatus "${sessionData.status}". Presensi hanya dapat dicatat saat sesi DIBUKA.`,
        };
      }

      const attendanceConfig = sessionData.attendanceConfig as Record<string, unknown> | undefined;
      if (!attendanceConfig || !attendanceConfig.coordinates || typeof attendanceConfig.radiusMeters !== 'number') {
        throw {
          status: 409,
          code: 'LAB_NOT_CONFIGURED',
          message: 'Sesi praktikum belum memiliki snapshot konfigurasi laboratorium atau radius presensi.',
        };
      }

      // c. Verifikasi enrollment kelas praktikan (D-04)
      const enrollmentRef = db.doc(`enrollments/${uid}/classes/${classId}`);
      const enrollmentSnap = await t.get(enrollmentRef);

      if (!enrollmentSnap.exists) {
        throw {
          status: 403,
          code: 'FORBIDDEN',
          message: 'Akses ditolak. Anda tidak terdaftar sebagai praktikan pada kelas praktikum ini.',
        };
      }

      // d. Verifikasi QR challenge (D-05)
      const challengeRef = db.doc(`attendanceChallenges/${challengeId}`);
      const challengeSnap = await t.get(challengeRef);

      if (!challengeSnap.exists) {
        throw {
          status: 400,
          code: 'QR_INVALID',
          message: 'Kode QR presensi tidak dikenali oleh sistem.',
        };
      }

      const challengeData = challengeSnap.data() as Record<string, unknown>;
      if (challengeData.sessionId !== sessionId) {
        throw {
          status: 400,
          code: 'QR_INVALID',
          message: 'Kode QR presensi bukan milik sesi praktikum ini.',
        };
      }

      if (challengeData.status !== 'active') {
        throw {
          status: 409,
          code: 'QR_EXPIRED',
          message: 'Kode QR telah dicabut atau diperbarui oleh asisten. Silakan pindai QR terbaru.',
        };
      }

      const expiresAt = new Date(String(challengeData.expiresAt));
      if (serverNowMs > expiresAt.getTime()) {
        throw {
          status: 409,
          code: 'QR_EXPIRED',
          message: 'Kode QR telah kedaluwarsa. Silakan pindai QR terbaru dari asisten.',
        };
      }

      const expectedHash = hashQrToken(rawToken);
      if (expectedHash !== challengeData.tokenHash) {
        throw {
          status: 400,
          code: 'QR_INVALID',
          message: 'Token QR tidak cocok dengan rahasia sesi server.',
        };
      }

      // e. Hitung jarak Haversine server-side (D-05)
      const labCoords = attendanceConfig.coordinates as { latitude: number; longitude: number };
      const distanceMeters = calculateHaversineDistanceMeters(cleanLocation, labCoords);
      const radiusMeters = attendanceConfig.radiusMeters as number;

      if (distanceMeters > radiusMeters) {
        throw {
          status: 422,
          code: 'OUTSIDE_RADIUS',
          message: `Posisi Anda berada di luar radius presensi laboratorium (${distanceMeters.toFixed(1)}m > batas ${radiusMeters}m). Pastikan Anda berada di ruang laboratorium.`,
        };
      }

      // f. Tulis dokumen presensi atomik (D-06)
      const nowIso = new Date().toISOString();
      const newAttendanceDoc: Record<string, unknown> = {
        sessionId,
        classId,
        studentUid: uid,
        studentId,
        studentName,
        className,
        checkedInAt: FieldValue.serverTimestamp(),
        verification: {
          method: 'qr-geotag',
          labId: attendanceConfig.labId,
          labConfigVersion: attendanceConfig.labConfigVersion ?? 1,
          policyVersion: attendanceConfig.policyVersion ?? 's3-v1',
          challengeId,
          distanceMeters,
          radiusMeters,
          location: {
            latitude: cleanLocation.latitude,
            longitude: cleanLocation.longitude,
            accuracyMeters: cleanLocation.accuracyMeters,
            capturedAtMs: cleanLocation.capturedAtMs,
          },
          locationAgeMs: locationValidation.locationAgeMs ?? 0,
        },
      };

      if (notes) {
        newAttendanceDoc.notes = notes;
      }

      t.set(attendanceRef, newAttendanceDoc);

      return {
        status: 'recorded' as const,
        attendanceId,
        checkedInAt: nowIso,
        distanceMeters,
        radiusMeters,
      };
    });

    return Response.json(transactionResult, { status: 200, headers });
  } catch (err: unknown) {
    if (typeof err === 'object' && err !== null && 'code' in err && 'status' in err) {
      const e = err as { status: number; code: string; message: string };
      return errorResponse(e.status, e.code, e.message);
    }
    const message = (err as Error)?.message ?? 'Terjadi kesalahan internal server.';
    return errorResponse(500, 'INTERNAL_ERROR', message);
  }
}
