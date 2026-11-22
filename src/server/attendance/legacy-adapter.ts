import type { AttendanceConfigSnapshot, LabConfiguration } from '@/types/sprint3';

import { isValidLabId } from '@/server/labs/lab-service';

export function isLegacySession(session: Record<string, unknown>): boolean {
  return (
    !session.labId ||
    session.radiusMeters === undefined ||
    session.radiusMeters === null ||
    !session.attendanceConfig
  );
}

export function validateRadius(radiusMeters: unknown): { valid: boolean; error?: string } {
  if (
    typeof radiusMeters !== 'number' ||
    !Number.isFinite(radiusMeters) ||
    radiusMeters <= 0
  ) {
    return {
      valid: false,
      error: 'Radius presensi harus berupa angka positif finit dalam satuan meter.',
    };
  }
  return { valid: true };
}

export interface SessionConfigurationCheck {
  valid: boolean;
  error?: string;
}

export function validateSessionConfiguration(
  session: { labId?: unknown; radiusMeters?: unknown; status?: unknown }
): SessionConfigurationCheck {
  if (!session.labId) {
    return {
      valid: false,
      error:
        'Sesi praktikum belum memiliki konfigurasi laboratorium. Asisten pengampu wajib memilih salah satu lab resmi sebelum membuka sesi.',
    };
  }

  if (!isValidLabId(session.labId)) {
    return {
      valid: false,
      error: `ID laboratorium "${String(session.labId)}" tidak valid. Pilihan resmi: lab-ap, lab-b, lab-c, lab-d.`,
    };
  }

  const radiusCheck = validateRadius(session.radiusMeters);
  if (!radiusCheck.valid) {
    return radiusCheck;
  }

  return { valid: true };
}

export function createAttendanceConfigSnapshot(
  lab: LabConfiguration,
  radiusMeters: number,
  policyVersion = 's3-v1'
): AttendanceConfigSnapshot {
  if (!lab.enabled || !lab.coordinates) {
    throw new Error(
      `Laboratorium "${lab.name}" (${lab.id}) belum aktif atau belum memiliki koordinat resmi.`
    );
  }

  const radiusCheck = validateRadius(radiusMeters);
  if (!radiusCheck.valid) {
    throw new Error(radiusCheck.error);
  }

  return {
    labId: lab.id,
    coordinates: {
      latitude: lab.coordinates.latitude,
      longitude: lab.coordinates.longitude,
    },
    labConfigVersion: lab.configVersion,
    radiusMeters,
    policyVersion,
  };
}
