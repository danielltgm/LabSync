import type { AttendanceQrPayload } from '../../types/sprint3';

export type QrValidationErrorCode =
  | 'EMPTY_QR'
  | 'INVALID_FORMAT'
  | 'UNSUPPORTED_VERSION'
  | 'WRONG_SESSION'
  | 'QR_EXPIRED';

export type QrValidationResult =
  | { ok: true; payload: AttendanceQrPayload }
  | { ok: false; code: QrValidationErrorCode; message: string };

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

export function parseAttendanceQrPayload(
  raw: string,
  expectedSessionId: string,
): QrValidationResult {
  const trimmed = raw.trim();
  if (!trimmed) {
    return {
      ok: false,
      code: 'EMPTY_QR',
      message: 'QR kosong. Arahkan kamera ke QR presensi asisten lalu coba lagi.',
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return {
      ok: false,
      code: 'INVALID_FORMAT',
      message: 'QR bukan format LabSync yang valid. Pastikan memindai QR presensi resmi.',
    };
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return {
      ok: false,
      code: 'INVALID_FORMAT',
      message: 'Struktur QR tidak dikenali. Pindai ulang QR presensi dari layar asisten.',
    };
  }

  const record = parsed as Record<string, unknown>;
  if (record.version !== 1) {
    return {
      ok: false,
      code: 'UNSUPPORTED_VERSION',
      message: 'Versi QR presensi tidak didukung. Minta asisten menampilkan QR terbaru.',
    };
  }

  if (
    !isNonEmptyString(record.sessionId) ||
    !isNonEmptyString(record.challengeId) ||
    !isNonEmptyString(record.token)
  ) {
    return {
      ok: false,
      code: 'INVALID_FORMAT',
      message: 'Data QR tidak lengkap. Pindai ulang QR presensi dari layar asisten.',
    };
  }

  if (record.sessionId.trim() !== expectedSessionId) {
    return {
      ok: false,
      code: 'WRONG_SESSION',
      message: 'QR ini milik sesi praktikum lain. Buka halaman sesi yang sesuai atau pindai QR sesi ini.',
    };
  }

  return {
    ok: true,
    payload: {
      version: 1,
      sessionId: record.sessionId.trim(),
      challengeId: record.challengeId.trim(),
      token: record.token.trim(),
    },
  };
}
