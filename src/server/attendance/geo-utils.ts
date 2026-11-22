import type { Coordinates } from '@/types/sprint3';

export const EARTH_RADIUS_METERS = 6371000;

export interface PolicyConstraints {
  maxLocationAgeMs?: number | null;
  maxAccuracyMeters?: number | null;
  maxFutureSkewMs?: number | null;
}

export interface StrictPolicyConstraints {
  maxLocationAgeMs: number;
  maxAccuracyMeters: number;
  maxFutureSkewMs: number;
}

export const DEFAULT_POLICY_CONSTRAINTS: StrictPolicyConstraints = {
  maxLocationAgeMs: 30000,
  maxAccuracyMeters: 30,
  maxFutureSkewMs: 5000,
};

/**
 * Menghitung jarak geodesic antara dua titik koordinat menggunakan formula Haversine.
 * Mengembalikan jarak dalam satuan meter (dibulatkan 2 desimal).
 */
export function calculateHaversineDistanceMeters(
  point1: Coordinates,
  point2: Coordinates
): number {
  const toRad = (degrees: number) => (degrees * Math.PI) / 180;

  const lat1 = point1.latitude;
  const lon1 = point1.longitude;
  const lat2 = point2.latitude;
  const lon2 = point2.longitude;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = EARTH_RADIUS_METERS * c;

  return Math.round(distance * 100) / 100;
}

export interface LocationValidationResult {
  valid: boolean;
  code?: 'LOCATION_INVALID' | 'LOCATION_STALE' | 'LOCATION_INACCURATE';
  message?: string;
  locationAgeMs?: number;
}

/**
 * Memvalidasi apakah fix lokasi dari perangkat praktikan memenuhi syarat keabsahan geografis
 * dan batasan toleransi kebijakan (D-05).
 */
export function validateDeviceLocation(
  location: unknown,
  policy: PolicyConstraints = DEFAULT_POLICY_CONSTRAINTS,
  serverNowMs = Date.now()
): LocationValidationResult {
  if (typeof location !== 'object' || location === null || Array.isArray(location)) {
    return {
      valid: false,
      code: 'LOCATION_INVALID',
      message: 'Data lokasi perangkat wajib disertakan dalam format objek yang valid.',
    };
  }

  const loc = location as Record<string, unknown>;
  const { latitude, longitude, accuracyMeters, capturedAtMs } = loc;

  // 1. Validasi tipe data dan angka finit
  if (
    typeof latitude !== 'number' ||
    !Number.isFinite(latitude) ||
    typeof longitude !== 'number' ||
    !Number.isFinite(longitude)
  ) {
    return {
      valid: false,
      code: 'LOCATION_INVALID',
      message: 'Koordinat latitude dan longitude harus berupa angka finit.',
    };
  }

  // 2. Rentang geografis bumi
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    return {
      valid: false,
      code: 'LOCATION_INVALID',
      message: 'Koordinat lintang atau bujur di luar rentang geografis bumi yang valid.',
    };
  }

  // 3. Validasi akurasi
  if (
    typeof accuracyMeters !== 'number' ||
    !Number.isFinite(accuracyMeters) ||
    accuracyMeters < 0
  ) {
    return {
      valid: false,
      code: 'LOCATION_INVALID',
      message: 'Akurasi GPS (accuracyMeters) harus berupa angka positif finit.',
    };
  }

  const maxAccuracy =
    typeof policy.maxAccuracyMeters === 'number'
      ? policy.maxAccuracyMeters
      : DEFAULT_POLICY_CONSTRAINTS.maxAccuracyMeters;
  if (accuracyMeters > maxAccuracy) {
    return {
      valid: false,
      code: 'LOCATION_INACCURATE',
      message: `Akurasi sinyal GPS (${accuracyMeters.toFixed(1)}m) terlalu rendah. Maksimum toleransi adalah ${maxAccuracy}m.`,
    };
  }

  // 4. Validasi timestamp pengambilan lokasi
  if (
    typeof capturedAtMs !== 'number' ||
    !Number.isFinite(capturedAtMs) ||
    capturedAtMs <= 0
  ) {
    return {
      valid: false,
      code: 'LOCATION_INVALID',
      message: 'Timestamp pengambilan lokasi (capturedAtMs) tidak valid.',
    };
  }

  const maxFutureSkew =
    typeof policy.maxFutureSkewMs === 'number'
      ? policy.maxFutureSkewMs
      : DEFAULT_POLICY_CONSTRAINTS.maxFutureSkewMs;
  if (capturedAtMs > serverNowMs + maxFutureSkew) {
    return {
      valid: false,
      code: 'LOCATION_STALE',
      message: 'Waktu pengukuran lokasi berada di masa depan melebihi batas toleransi jam perangkat.',
    };
  }

  const locationAgeMs = serverNowMs - capturedAtMs;
  const maxAge =
    typeof policy.maxLocationAgeMs === 'number'
      ? policy.maxLocationAgeMs
      : DEFAULT_POLICY_CONSTRAINTS.maxLocationAgeMs;
  if (locationAgeMs > maxAge) {
    return {
      valid: false,
      code: 'LOCATION_STALE',
      message: `Pengukuran lokasi sudah terlalu lama (${Math.round(locationAgeMs / 1000)} detik yang lalu). Silakan perbarui lokasi perangkat.`,
      locationAgeMs,
    };
  }

  return {
    valid: true,
    locationAgeMs: Math.max(0, locationAgeMs),
  };
}
