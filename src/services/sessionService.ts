import { doc, getDoc, runTransaction } from 'firebase/firestore';

import { firebase } from '@/firebase/client';
import {
  createSessionMutation,
  deleteSessionMutation,
  updateSessionMutation,
  type ExtendedSessionDocument,
} from '@/firebase/mutations';
import {
  createAttendanceConfigSnapshot,
  validateRadius,
  validateSessionConfiguration,
} from '@/server/attendance/legacy-adapter';
import { calculateSessionTimestamps } from '@/server/attendance/schedule-utils';
import { getLabConfiguration, isValidLabId } from '@/server/labs/lab-service';
import type { SessionDocument } from '@/types/sprint2';
import type {
  AttendanceConfigSnapshot,
  LabConfiguration,
  LabId,
  Sprint3SessionFields,
} from '@/types/sprint3';

export interface SessionInput {
  classId: string;
  courseName: string;
  className: string;
  labRoom: string;
  date: string;
  startTime: string;
  endTime: string;
  assistantName: string;
  labId?: LabId;
  radiusMeters?: number;
}

export interface SessionServiceResult {
  success: boolean;
  sessionId?: string;
  error?: string;
}

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const TIME_REGEX = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

export function validateSessionInput(input: SessionInput): string | null {
  if (!input.classId?.trim()) return 'Pilihan kelas wajib ditentukan.';
  if (!input.courseName?.trim()) return 'Nama praktikum wajib diisi.';
  if (!input.className?.trim()) return 'Nama kelas praktikum wajib diisi.';
  if (!input.labRoom?.trim()) return 'Ruang laboratorium wajib diisi.';
  if (!input.date?.trim() || !DATE_REGEX.test(input.date.trim())) {
    return 'Format tanggal harus YYYY-MM-DD (contoh: 2026-11-20).';
  }
  if (!input.startTime?.trim() || !TIME_REGEX.test(input.startTime.trim())) {
    return 'Format jam mulai harus HH:mm (contoh: 08:00).';
  }
  if (!input.endTime?.trim() || !TIME_REGEX.test(input.endTime.trim())) {
    return 'Format jam selesai harus HH:mm (contoh: 10:00).';
  }
  const date = input.date.trim();
  const day = new Date(date + 'T00:00:00Z');
  if (Number.isNaN(day.getTime()) || day.toISOString().slice(0, 10) !== date) {
    return 'Tanggal tidak valid.';
  }
  if (input.startTime.trim() >= input.endTime.trim()) {
    return 'Jam selesai harus setelah jam mulai.';
  }
  if (!input.assistantName?.trim()) return 'Nama asisten pengampu wajib diisi.';

  if (input.labId !== undefined && !isValidLabId(input.labId)) {
    return `Pilihan laboratorium "${String(input.labId)}" tidak valid. Pilihan resmi: lab-ap, lab-b, lab-c, lab-d.`;
  }

  if (input.radiusMeters !== undefined) {
    const radiusCheck = validateRadius(input.radiusMeters);
    if (!radiusCheck.valid) {
      return radiusCheck.error ?? 'Radius tidak valid.';
    }
  }

  return null;
}

export async function createSession(
  input: SessionInput
): Promise<SessionServiceResult> {
  const validationError = validateSessionInput(input);
  if (validationError) {
    return { success: false, error: validationError };
  }
  if (!firebase) {
    return { success: false, error: 'Koneksi database tidak tersedia.' };
  }

  try {
    const sessionData: ExtendedSessionDocument = {
      classId: input.classId.trim(),
      courseName: input.courseName.trim(),
      className: input.className.trim(),
      labRoom: input.labRoom.trim(),
      date: input.date.trim(),
      startTime: input.startTime.trim(),
      endTime: input.endTime.trim(),
      assistantName: input.assistantName.trim(),
      status: 'TERJADWAL',
    };

    if (input.labId && input.radiusMeters !== undefined) {
      const timestamps = calculateSessionTimestamps(
        input.date.trim(),
        input.startTime.trim(),
        input.endTime.trim()
      );
      sessionData.labId = input.labId;
      sessionData.radiusMeters = input.radiusMeters;
      sessionData.scheduleRevision = 1;
      sessionData.startsAt = timestamps.startsAt;
      sessionData.endsAt = timestamps.endsAt;
    }

    const sessionId = await createSessionMutation(firebase.db, sessionData);
    return { success: true, sessionId };
  } catch (err: unknown) {
    const message = (err as Error)?.message ?? 'Gagal membuat sesi praktikum.';
    return { success: false, error: message };
  }
}

export async function deleteSession(
  sessionId: string
): Promise<SessionServiceResult> {
  if (!sessionId) {
    return { success: false, error: 'ID sesi tidak valid.' };
  }
  if (!firebase) {
    return { success: false, error: 'Koneksi database tidak tersedia.' };
  }

  try {
    await deleteSessionMutation(firebase.db, sessionId);
    return { success: true, sessionId };
  } catch (err: unknown) {
    const message = (err as Error)?.message ?? 'Gagal menghapus sesi praktikum.';
    return { success: false, error: message };
  }
}

export async function updateSessionDetails(
  sessionId: string,
  details: Partial<Omit<SessionDocument, 'status' | 'classId'>> & Partial<Sprint3SessionFields>
): Promise<SessionServiceResult> {
  if (!sessionId) {
    return { success: false, error: 'ID sesi tidak valid.' };
  }
  if (!firebase) {
    return { success: false, error: 'Koneksi database tidak tersedia.' };
  }

  try {
    await updateSessionMutation(firebase.db, sessionId, details);
    return { success: true, sessionId };
  } catch (err: unknown) {
    const message = (err as Error)?.message ?? 'Gagal memperbarui sesi praktikum.';
    return { success: false, error: message };
  }
}

export interface ConfigureLabInput {
  sessionId: string;
  labId: LabId;
  radiusMeters: number;
}

/**
 * Mengonfigurasi pilihan lab dan radius pada sesi TERJADWAL (D-02, D-09).
 */
export async function configureSessionLab(
  input: ConfigureLabInput
): Promise<SessionServiceResult> {
  const cleanSessionId = input.sessionId?.trim();
  if (!cleanSessionId) {
    return { success: false, error: 'ID sesi tidak valid.' };
  }

  if (!isValidLabId(input.labId)) {
    return {
      success: false,
      error: `Pilihan laboratorium "${String(input.labId)}" tidak valid. Pilihan resmi: lab-ap, lab-b, lab-c, lab-d.`,
    };
  }

  const radiusCheck = validateRadius(input.radiusMeters);
  if (!radiusCheck.valid) {
    return { success: false, error: radiusCheck.error };
  }

  if (!firebase) {
    return { success: false, error: 'Koneksi database tidak tersedia.' };
  }

  try {
    const sessionRef = doc(firebase.db, 'sessions', cleanSessionId);
    const snap = await getDoc(sessionRef);
    if (!snap.exists()) {
      return { success: false, error: 'Sesi praktikum tidak ditemukan.' };
    }

    const current = snap.data() as ExtendedSessionDocument;
    if (current.status !== 'TERJADWAL') {
      return {
        success: false,
        error: 'Konfigurasi lab dan radius hanya dapat diubah saat sesi berstatus TERJADWAL.',
      };
    }

    const timestamps = calculateSessionTimestamps(
      current.date,
      current.startTime,
      current.endTime
    );

    const nextRevision = (current.scheduleRevision ?? 0) + 1;

    await updateSessionMutation(firebase.db, cleanSessionId, {
      labId: input.labId,
      radiusMeters: input.radiusMeters,
      startsAt: timestamps.startsAt,
      endsAt: timestamps.endsAt,
      scheduleRevision: nextRevision,
    });

    return { success: true, sessionId: cleanSessionId };
  } catch (err: unknown) {
    const message = (err as Error)?.message ?? 'Gagal mengonfigurasi laboratorium dan radius.';
    return { success: false, error: message };
  }
}

export interface SessionOpeningValidationResult {
  success: boolean;
  error?: string;
  session?: ExtendedSessionDocument;
  lab?: LabConfiguration;
}

/**
 * Memvalidasi apakah sesi memenuhi syarat untuk dibuka (D-02, D-09).
 * Menolak sesi tanpa konfigurasi lab aktif & radius positif.
 */
export async function validateSessionForOpening(
  sessionId: string
): Promise<SessionOpeningValidationResult> {
  const cleanSessionId = sessionId?.trim();
  if (!cleanSessionId) {
    return { success: false, error: 'ID sesi tidak valid.' };
  }
  if (!firebase) {
    return { success: false, error: 'Koneksi database tidak tersedia.' };
  }

  const sessionRef = doc(firebase.db, 'sessions', cleanSessionId);
  const snap = await getDoc(sessionRef);
  if (!snap.exists()) {
    return { success: false, error: 'Sesi praktikum tidak ditemukan.' };
  }

  const sessionData = snap.data() as ExtendedSessionDocument;
  if (sessionData.status !== 'TERJADWAL') {
    return {
      success: false,
      error: `Sesi tidak dapat dibuka karena status saat ini adalah "${sessionData.status}".`,
    };
  }

  const configCheck = validateSessionConfiguration(sessionData);
  if (!configCheck.valid) {
    return {
      success: false,
      error: configCheck.error ?? 'Konfigurasi laboratorium dan radius belum lengkap.',
    };
  }

  const lab = await getLabConfiguration(firebase.db, sessionData.labId!);
  if (!lab) {
    return {
      success: false,
      error: `Laboratorium "${sessionData.labId}" tidak terdaftar dalam master data.`,
    };
  }

  if (!lab.enabled || !lab.coordinates) {
    return {
      success: false,
      error: `Laboratorium "${lab.name}" belum aktif atau belum memiliki koordinat resmi. Hubungi admin/PM.`,
    };
  }

  return { success: true, session: sessionData, lab };
}

/**
 * Membuka sesi praktikum TERJADWAL -> DIBUKA dengan menyertakan immutable attendanceConfig snapshot (D-02, D-03).
 */
export async function openSessionWithConfig(
  sessionId: string,
  policyVersion = 's3-v1'
): Promise<SessionServiceResult & { attendanceConfig?: AttendanceConfigSnapshot }> {
  const validation = await validateSessionForOpening(sessionId);
  if (!validation.success || !validation.session || !validation.lab) {
    return { success: false, error: validation.error };
  }

  if (!firebase) {
    return { success: false, error: 'Koneksi database tidak tersedia.' };
  }

  try {
    const attendanceConfig = createAttendanceConfigSnapshot(
      validation.lab,
      validation.session.radiusMeters!,
      policyVersion
    );

    const sessionRef = doc(firebase.db, 'sessions', sessionId);

    await runTransaction(firebase.db, async (transaction) => {
      const snap = await transaction.get(sessionRef);
      if (!snap.exists()) throw new Error('Sesi praktikum tidak ditemukan.');
      const current = snap.data() as ExtendedSessionDocument;
      if (current.status !== 'TERJADWAL') {
        throw new Error('Sesi praktikum sudah tidak berstatus TERJADWAL.');
      }

      transaction.update(sessionRef, {
        status: 'DIBUKA',
        attendanceConfig,
      });
    });

    return { success: true, sessionId, attendanceConfig };
  } catch (err: unknown) {
    const message = (err as Error)?.message ?? 'Gagal membuka sesi praktikum.';
    return { success: false, error: message };
  }
}
