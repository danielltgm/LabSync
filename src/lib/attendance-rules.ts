import { distanceMeters } from '@/lib/geo';
import { MINUTE } from '@/lib/format';
import type { AttendanceStatus, CheckInFailure, CheckInMethod, Lab, Position, Session } from '@/data/types';

// Pure rules shared by the demo store and, later, the check-in API route.
// The server must run these with its own clock; the client only previews them.

export const EARLY_OPEN_MIN = 15;
export const QR_ROTATE_MS = 15_000;

export interface CheckInInput {
  session: Session;
  lab: Lab;
  nim: string;
  enrolled: boolean;
  alreadyCheckedIn: boolean;
  serverNow: number;
  method: CheckInMethod;
  position?: Position | null;
  qrToken?: string;
  /** Per-session secret (sessionSecrets/{id}), created by the server when the session opens. */
  qrSecret?: string;
}

export type CheckInVerdict =
  | { ok: true; status: AttendanceStatus; distanceM?: number; accuracyM?: number }
  | { ok: false; failure: CheckInFailure; distanceM?: number; accuracyM?: number };

export function evaluateCheckIn(input: CheckInInput): CheckInVerdict {
  const { session, lab, serverNow } = input;
  if (!input.enrolled) return { ok: false, failure: 'NOT_ENROLLED' };
  if (input.alreadyCheckedIn) return { ok: false, failure: 'ALREADY_CHECKED_IN' };
  if (session.status !== 'DIBUKA') return { ok: false, failure: 'SESSION_NOT_OPEN' };
  if (serverNow < session.startsAt - EARLY_OPEN_MIN * MINUTE || serverNow > session.endsAt) {
    return { ok: false, failure: 'OUTSIDE_TIME_WINDOW' };
  }

  if (input.method === 'QR' && !verifyQrToken(input.qrToken ?? '', session.id, serverNow, input.qrSecret ?? '')) {
    return { ok: false, failure: 'INVALID_QR' };
  }

  const position = input.position;
  if (!position) return { ok: false, failure: 'LOCATION_UNAVAILABLE' };
  if (position.mocked) return { ok: false, failure: 'MOCK_LOCATION', accuracyM: position.accuracyM };
  const distanceM = distanceMeters(position, lab);
  if (position.accuracyM > lab.maxAccuracyM) {
    return { ok: false, failure: 'LOW_ACCURACY', distanceM, accuracyM: position.accuracyM };
  }
  if (distanceM > lab.radiusM) {
    return { ok: false, failure: 'OUT_OF_RADIUS', distanceM, accuracyM: position.accuracyM };
  }

  const late = serverNow > session.startsAt + session.lateAfterMin * MINUTE;
  return { ok: true, status: late ? 'TERLAMBAT' : 'HADIR', distanceM, accuracyM: position.accuracyM };
}

export const FAILURE_COPY: Record<CheckInFailure, { title: string; body: string }> = {
  SESSION_NOT_OPEN: { title: 'Sesi belum dibuka', body: 'Tunggu asisten membuka sesi. Kamu akan dapat notifikasi saat sesi dibuka.' },
  OUTSIDE_TIME_WINDOW: { title: 'Di luar jam praktikum', body: 'Presensi hanya bisa 15 menit sebelum mulai sampai sesi berakhir, sesuai jam server.' },
  NOT_ENROLLED: { title: 'Kamu tidak terdaftar', body: 'Akun ini belum terdaftar di kelas tersebut. Hubungi asisten.' },
  ALREADY_CHECKED_IN: { title: 'Sudah presensi', body: 'Presensimu untuk pertemuan ini sudah tercatat.' },
  LOCATION_UNAVAILABLE: { title: 'Lokasi belum didapat', body: 'Aktifkan GPS dan izin lokasi, lalu tunggu sampai titikmu muncul.' },
  LOW_ACCURACY: { title: 'Sinyal GPS lemah', body: 'Akurasi lokasi terlalu rendah. Pindah ke dekat jendela atau tunggu beberapa detik.' },
  MOCK_LOCATION: { title: 'Lokasi palsu terdeteksi', body: 'Matikan aplikasi pemalsu lokasi. Percobaan ini dicatat untuk asisten.' },
  OUT_OF_RADIUS: { title: 'Di luar radius lab', body: 'Kamu harus berada di dalam area lab untuk presensi.' },
  INVALID_QR: { title: 'QR tidak valid', body: 'Kode sudah kedaluwarsa atau bukan untuk sesi ini. Pindai ulang QR di layar asisten.' },
};

/* ------------------------------------------------------------- QR tokens */

// Tokens are signed with a per-session random secret that only the class's staff and the server can
// read (sessionSecrets/{sessionId}). Students never see it, so they can't mint valid codes.

function hash(input: string) {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36).toUpperCase().padStart(7, '0').slice(0, 7);
}

export function qrSlot(now: number) {
  return Math.floor(now / QR_ROTATE_MS);
}

export function createQrToken(sessionId: string, now: number, secret: string) {
  const slot = qrSlot(now);
  return `LABSYNC:${sessionId}:${slot}:${hash(`${sessionId}:${slot}:${secret}`)}`;
}

/** Short human code shown under the QR for manual entry. */
export function shortCode(token: string) {
  return token.split(':').pop() ?? '';
}

export function verifyQrToken(token: string, sessionId: string, now: number, secret: string) {
  if (!secret) return false;
  const trimmed = token.trim().toUpperCase();
  const slot = qrSlot(now);
  return [slot, slot - 1].some((s) => {
    const full = createQrToken(sessionId, s * QR_ROTATE_MS, secret).toUpperCase();
    return trimmed === full || trimmed === shortCode(full);
  });
}
