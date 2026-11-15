import { firebase } from '@/firebase/client';
import {
  createClassMutation,
  deleteClassMutation,
  updateClassMutation,
} from '@/firebase/mutations';

export interface ClassServiceResult {
  success: boolean;
  classId?: string;
  error?: string;
}

export async function createClass(
  name: string,
  assistantUid: string
): Promise<ClassServiceResult> {
  const trimmedName = name.trim();
  if (!trimmedName) {
    return { success: false, error: 'Nama kelas wajib diisi.' };
  }
  if (!assistantUid) {
    return { success: false, error: 'Asisten pengampu tidak valid.' };
  }
  if (!firebase) {
    return { success: false, error: 'Koneksi database tidak tersedia.' };
  }

  try {
    const classId = await createClassMutation(firebase.db, {
      name: trimmedName,
      assistantUid,
    });
    return { success: true, classId };
  } catch (err: unknown) {
    const message = (err as Error)?.message ?? 'Gagal membuat kelas.';
    return { success: false, error: message };
  }
}

export async function updateClass(
  classId: string,
  name: string
): Promise<ClassServiceResult> {
  const trimmedName = name.trim();
  if (!trimmedName) {
    return { success: false, error: 'Nama kelas wajib diisi.' };
  }
  if (!classId) {
    return { success: false, error: 'ID kelas tidak valid.' };
  }
  if (!firebase) {
    return { success: false, error: 'Koneksi database tidak tersedia.' };
  }

  try {
    await updateClassMutation(firebase.db, classId, trimmedName);
    return { success: true, classId };
  } catch (err: unknown) {
    const message = (err as Error)?.message ?? 'Gagal memperbarui kelas.';
    return { success: false, error: message };
  }
}

export async function deleteClass(
  classId: string
): Promise<ClassServiceResult> {
  if (!classId) {
    return { success: false, error: 'ID kelas tidak valid.' };
  }
  if (!firebase) {
    return { success: false, error: 'Koneksi database tidak tersedia.' };
  }

  try {
    await deleteClassMutation(firebase.db, classId);
    return { success: true, classId };
  } catch (err: unknown) {
    const message = (err as Error)?.message ?? 'Gagal menghapus kelas.';
    return { success: false, error: message };
  }
}
