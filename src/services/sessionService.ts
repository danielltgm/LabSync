import { firebase } from '@/firebase/client';
import {
  createSessionMutation,
  deleteSessionMutation,
  updateSessionMutation,
} from '@/firebase/mutations';
import type { SessionDocument } from '@/types/sprint2';

export interface SessionInput {
  classId: string;
  courseName: string;
  className: string;
  labRoom: string;
  date: string;
  startTime: string;
  endTime: string;
  assistantName: string;
}

export interface SessionServiceResult {
  success: boolean;
  sessionId?: string;
  error?: string;
}

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const TIME_REGEX = /^\d{2}:\d{2}$/;

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
  if (!input.assistantName?.trim()) return 'Nama asisten pengampu wajib diisi.';

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
    const sessionData: SessionDocument = {
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
  details: Partial<Omit<SessionDocument, 'status' | 'classId'>>
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
