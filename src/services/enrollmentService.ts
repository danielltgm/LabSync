import { firebase } from '@/firebase/client';
import {
  enrollStudentMutation,
  unenrollStudentMutation,
} from '@/firebase/mutations';

export interface EnrollmentServiceResult {
  success: boolean;
  error?: string;
}

export async function enrollStudent(
  classId: string,
  studentUid: string
): Promise<EnrollmentServiceResult> {
  const trimmedClassId = classId.trim();
  const trimmedStudentUid = studentUid.trim();

  if (!trimmedClassId) {
    return { success: false, error: 'ID kelas tidak boleh kosong.' };
  }
  if (!trimmedStudentUid) {
    return { success: false, error: 'UID praktikan tidak boleh kosong.' };
  }
  if (!firebase) {
    return { success: false, error: 'Koneksi database tidak tersedia.' };
  }

  try {
    await enrollStudentMutation(firebase.db, trimmedClassId, trimmedStudentUid);
    return { success: true };
  } catch (err: unknown) {
    const message = (err as Error)?.message ?? 'Gagal mendaftarkan praktikan ke kelas.';
    return { success: false, error: message };
  }
}

export async function unenrollStudent(
  classId: string,
  studentUid: string
): Promise<EnrollmentServiceResult> {
  const trimmedClassId = classId.trim();
  const trimmedStudentUid = studentUid.trim();

  if (!trimmedClassId || !trimmedStudentUid) {
    return { success: false, error: 'Parameter enrollment tidak valid.' };
  }
  if (!firebase) {
    return { success: false, error: 'Koneksi database tidak tersedia.' };
  }

  try {
    await unenrollStudentMutation(firebase.db, trimmedClassId, trimmedStudentUid);
    return { success: true };
  } catch (err: unknown) {
    const message = (err as Error)?.message ?? 'Gagal membatalkan enrollment praktikan.';
    return { success: false, error: message };
  }
}
