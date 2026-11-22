import type { LiveAttendanceRecord } from '../../types/attendance-view';
import type { SessionStatus } from '../../types/session';

export type PresensiAvailability =
  | { kind: 'already-attended'; record: LiveAttendanceRecord; canScan: false; message: string }
  | { kind: 'open'; canScan: true; message: string }
  | { kind: 'scheduled'; canScan: false; message: string }
  | { kind: 'closed'; canScan: false; message: string };

export function resolvePresensiAvailability(
  status: SessionStatus,
  ownAttendance: LiveAttendanceRecord | null,
): PresensiAvailability {
  if (ownAttendance) {
    return {
      kind: 'already-attended',
      record: ownAttendance,
      canScan: false,
      message: `Kehadiran Anda sudah tercatat pada pukul ${ownAttendance.checkInTime} WIB.`,
    };
  }
  if (status === 'DIBUKA') {
    return {
      kind: 'open',
      canScan: true,
      message: 'Sesi sedang dibuka. Pindai QR asisten dan pastikan lokasi GPS aktif.',
    };
  }
  if (status === 'TERJADWAL') {
    return {
      kind: 'scheduled',
      canScan: false,
      message: 'Sesi belum dibuka oleh asisten. Tunggu hingga status sesi menjadi DIBUKA.',
    };
  }
  return {
    kind: 'closed',
    canScan: false,
    message: 'Sesi praktikum telah selesai. Aksi presensi dinonaktifkan.',
  };
}
