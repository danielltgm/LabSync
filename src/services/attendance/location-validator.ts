import type { DeviceLocationFix, Sprint3PolicyDraft } from '../../types/sprint3';

export type LocationValidationErrorCode =
  | 'LOCATION_INVALID'
  | 'LOCATION_STALE'
  | 'LOCATION_INACCURATE';

export type LocationValidationResult =
  | { ok: true; ageMs: number }
  | { ok: false; code: LocationValidationErrorCode; message: string };

export const DEFAULT_LOCATION_POLICY: Pick<
  Sprint3PolicyDraft,
  'maxLocationAgeMs' | 'maxAccuracyMeters' | 'maxFutureSkewMs'
> = {
  maxLocationAgeMs: 30_000,
  maxAccuracyMeters: 30,
  maxFutureSkewMs: 5_000,
};

function finiteInRange(value: number, min: number, max: number) {
  return typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;
}

export function validateDeviceLocationFix(
  fix: DeviceLocationFix | null | undefined,
  policy: Pick<Sprint3PolicyDraft, 'maxLocationAgeMs' | 'maxAccuracyMeters' | 'maxFutureSkewMs'> = DEFAULT_LOCATION_POLICY,
  nowMs = Date.now(),
): LocationValidationResult {
  if (
    !fix ||
    !finiteInRange(fix.latitude, -90, 90) ||
    !finiteInRange(fix.longitude, -180, 180) ||
    !Number.isFinite(fix.accuracyMeters) ||
    fix.accuracyMeters <= 0 ||
    !Number.isFinite(fix.capturedAtMs) ||
    fix.capturedAtMs <= 0
  ) {
    return {
      ok: false,
      code: 'LOCATION_INVALID',
      message: 'Data koordinat perangkat tidak valid. Ambil ulang lokasi GPS Anda.',
    };
  }

  const ageMs = nowMs - fix.capturedAtMs;
  const maxFutureSkewMs = policy.maxFutureSkewMs ?? DEFAULT_LOCATION_POLICY.maxFutureSkewMs ?? 5_000;
  if (ageMs < -maxFutureSkewMs) {
    return {
      ok: false,
      code: 'LOCATION_INVALID',
      message: 'Waktu pengukuran GPS tidak wajar. Periksa pengaturan jam perangkat lalu ambil ulang lokasi.',
    };
  }

  const maxAgeMs = policy.maxLocationAgeMs ?? DEFAULT_LOCATION_POLICY.maxLocationAgeMs ?? 30_000;
  if (ageMs > maxAgeMs) {
    return {
      ok: false,
      code: 'LOCATION_STALE',
      message: `Data lokasi sudah terlalu lama (${Math.round(ageMs / 1000)} detik). Ambil ulang lokasi terkini.`,
    };
  }

  const maxAccuracyMeters = policy.maxAccuracyMeters ?? DEFAULT_LOCATION_POLICY.maxAccuracyMeters ?? 30;
  if (fix.accuracyMeters > maxAccuracyMeters) {
    return {
      ok: false,
      code: 'LOCATION_INACCURATE',
      message: `Akurasi GPS belum memadai (${Math.round(fix.accuracyMeters)} m > ${maxAccuracyMeters} m). Pindah ke area sinyal lebih jelas lalu ambil ulang lokasi.`,
    };
  }

  return { ok: true, ageMs: Math.max(0, ageMs) };
}
