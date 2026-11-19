import type {
  AttendanceConfigSnapshot,
  Coordinates,
  DeviceLocationFix,
  LabConfiguration,
} from '../../types/sprint3';

export type ClientRadiusHint =
  | { kind: 'lab-unconfigured'; message: string }
  | { kind: 'waiting-location'; labName: string; radiusMeters: number; message: string }
  | {
      kind: 'inside-radius' | 'outside-radius';
      labName: string;
      radiusMeters: number;
      estimatedDistanceMeters: number;
      message: string;
    };

const EARTH_RADIUS_METERS = 6_371_000;

export function calculateDistanceMeters(a: Coordinates, b: Coordinates): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);

  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h = sinLat * sinLat + Math.cos(lat1) * Math.cos(lat2) * sinLng * sinLng;
  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function evaluateClientRadiusHint(
  fix: DeviceLocationFix | null,
  attendanceConfig: AttendanceConfigSnapshot | null,
  lab: LabConfiguration | null,
  fallbackLabName: string,
  fallbackRadiusMeters: number | null,
): ClientRadiusHint {
  const targetCoords: Coordinates | null =
    attendanceConfig?.coordinates ?? (lab?.enabled ? lab.coordinates : null);
  const radiusMeters = attendanceConfig?.radiusMeters ?? fallbackRadiusMeters;
  const labName = lab?.name ?? fallbackLabName;

  if (!targetCoords || !radiusMeters || radiusMeters <= 0) {
    return {
      kind: 'lab-unconfigured',
      message: 'Koordinat atau radius lab belum aktif. Presensi tidak dapat diselesaikan tanpa konfigurasi resmi.',
    };
  }

  if (!fix) {
    return {
      kind: 'waiting-location',
      labName,
      radiusMeters,
      message: `Target ${labName} (radius ${radiusMeters} m). Ambil lokasi perangkat untuk melihat perkiraan jarak.`,
    };
  }

  const estimatedDistanceMeters = Math.round(calculateDistanceMeters(fix, targetCoords));
  const inside = estimatedDistanceMeters <= radiusMeters;

  return {
    kind: inside ? 'inside-radius' : 'outside-radius',
    labName,
    radiusMeters,
    estimatedDistanceMeters,
    message: inside
      ? `Perkiraan jarak ±${estimatedDistanceMeters} m (dalam radius ${radiusMeters} m). Keputusan akhir tetap diverifikasi server.`
      : `Perkiraan jarak ±${estimatedDistanceMeters} m (di luar radius ${radiusMeters} m). Dekati ${labName} lalu ambil ulang lokasi.`,
  };
}
