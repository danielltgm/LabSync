import type {
  CheckInErrorCode,
  CheckInRequest,
  CheckInResult,
} from '../../types/sprint3';

export type CheckInOutcome =
  | { kind: 'success'; data: CheckInResult }
  | { kind: 'server-error'; status: number; code: CheckInErrorCode | 'UNKNOWN'; message: string }
  | { kind: 'network-error'; message: string }
  | { kind: 'auth-missing'; message: string };

export interface SubmitCheckInOptions {
  endpointUrl: string | null;
  getIdToken: () => Promise<string | null>;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}

const KNOWN_ERROR_CODES = new Set<string>([
  'AUTH_REQUIRED',
  'FORBIDDEN',
  'SESSION_NOT_FOUND',
  'SESSION_CLOSED',
  'LAB_NOT_CONFIGURED',
  'POLICY_NOT_CONFIGURED',
  'QR_INVALID',
  'QR_EXPIRED',
  'LOCATION_INVALID',
  'LOCATION_STALE',
  'LOCATION_INACCURATE',
  'OUTSIDE_RADIUS',
  'RATE_LIMITED',
  'SERVICE_UNAVAILABLE',
]);

function parseErrorCode(value: unknown): CheckInErrorCode | 'UNKNOWN' {
  return typeof value === 'string' && KNOWN_ERROR_CODES.has(value)
    ? (value as CheckInErrorCode)
    : 'UNKNOWN';
}

export async function submitAttendanceCheckIn(
  request: CheckInRequest,
  options: SubmitCheckInOptions,
): Promise<CheckInOutcome> {
  const token = await options.getIdToken();
  if (!token) {
    return {
      kind: 'auth-missing',
      message: 'Sesi login tidak ditemukan. Silakan masuk kembali sebelum presensi.',
    };
  }

  if (!options.endpointUrl) {
    return {
      kind: 'server-error',
      status: 503,
      code: 'SERVICE_UNAVAILABLE',
      message: 'Alamat server presensi belum dikonfigurasi. Hubungi asisten atau PM.',
    };
  }

  const doFetch = options.fetchImpl ?? fetch;
  try {
    const response = await doFetch(options.endpointUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(request),
      signal: AbortSignal.timeout(options.timeoutMs ?? 15_000),
    });

    let body: Record<string, unknown> | null = null;
    try {
      body = (await response.json()) as Record<string, unknown>;
    } catch {
      body = null;
    }

    if (response.ok && body && (body.status === 'recorded' || body.status === 'already-recorded')) {
      return {
        kind: 'success',
        data: body as unknown as CheckInResult,
      };
    }

    const errObj =
      body && typeof body.error === 'object' && body.error !== null
        ? (body.error as Record<string, unknown>)
        : null;
    return {
      kind: 'server-error',
      status: response.status,
      code: parseErrorCode(errObj?.code),
      message:
        typeof errObj?.message === 'string' && errObj.message.trim()
          ? errObj.message
          : 'Permintaan presensi ditolak oleh server.',
    };
  } catch {
    return {
      kind: 'network-error',
      message: 'Koneksi ke server terputus. Periksa status presensi Anda atau coba kirim ulang.',
    };
  }
}
