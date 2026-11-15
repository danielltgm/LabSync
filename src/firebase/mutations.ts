import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  serverTimestamp,
  setDoc,
  updateDoc,
  type Firestore,
} from 'firebase/firestore';

import type { ClassDocument, SessionDocument, UserDocument } from '@/types/sprint2';

/**
 * Membuat kelas baru pada koleksi `classes`.
 * ID kelas dibuat secara otomatis oleh Firestore.
 */
export async function createClassMutation(
  db: Firestore,
  data: ClassDocument
): Promise<string> {
  const ref = await addDoc(collection(db, 'classes'), {
    name: data.name.trim(),
    assistantUid: data.assistantUid,
  });
  return ref.id;
}

/**
 * Memperbarui nama kelas pada path `classes/{classId}`.
 */
export async function updateClassMutation(
  db: Firestore,
  classId: string,
  name: string
): Promise<void> {
  const ref = doc(db, 'classes', classId);
  await updateDoc(ref, {
    name: name.trim(),
  });
}

/**
 * Menghapus kelas pada path `classes/{classId}`.
 */
export async function deleteClassMutation(
  db: Firestore,
  classId: string
): Promise<void> {
  const ref = doc(db, 'classes', classId);
  await deleteDoc(ref);
}

/**
 * Mendaftarkan praktikan ke kelas pada path `enrollments/{studentUid}/classes/{classId}`.
 */
export async function enrollStudentMutation(
  db: Firestore,
  classId: string,
  studentUid: string
): Promise<void> {
  const ref = doc(db, 'enrollments', studentUid, 'classes', classId);
  await setDoc(ref, {
    enrolledAt: serverTimestamp(),
  });
}

/**
 * Mencabut pendaftaran praktikan pada path `enrollments/{studentUid}/classes/{classId}`.
 */
export async function unenrollStudentMutation(
  db: Firestore,
  classId: string,
  studentUid: string
): Promise<void> {
  const ref = doc(db, 'enrollments', studentUid, 'classes', classId);
  await deleteDoc(ref);
}

/**
 * Membuat sesi praktikum baru dengan auto-generated ID dari Firestore.
 * Status awal wajib TERJADWAL per kontrak Sprint 2.
 */
export async function createSessionMutation(
  db: Firestore,
  data: SessionDocument
): Promise<string> {
  const ref = await addDoc(collection(db, 'sessions'), {
    classId: data.classId,
    courseName: data.courseName.trim(),
    className: data.className.trim(),
    labRoom: data.labRoom.trim(),
    date: data.date.trim(),
    startTime: data.startTime.trim(),
    endTime: data.endTime.trim(),
    assistantName: data.assistantName.trim(),
    status: 'TERJADWAL',
  });
  return ref.id;
}

/**
 * Menghapus sesi praktikum pada path `sessions/{sessionId}`.
 * Hanya sesi berstatus TERJADWAL yang dapat dihapus per aturan keamanan.
 */
export async function deleteSessionMutation(
  db: Firestore,
  sessionId: string
): Promise<void> {
  const ref = doc(db, 'sessions', sessionId);
  await deleteDoc(ref);
}

/**
 * Memperbarui data sesi praktikum pada path `sessions/{sessionId}`.
 */
export async function updateSessionMutation(
  db: Firestore,
  sessionId: string,
  data: Partial<Omit<SessionDocument, 'status' | 'classId'>>
): Promise<void> {
  const ref = doc(db, 'sessions', sessionId);
  await updateDoc(ref, data);
}

/**
 * Menyimpan dokumen profil user baru di path `users/{uid}`.
 * Sesuai kontrak Sprint 2, dokumen hanya memuat `name`, `identifier`, dan `role`.
 */
export async function createUserProfile(
  db: Firestore,
  uid: string,
  profile: UserDocument
): Promise<void> {
  const userRef = doc(db, 'users', uid);
  await setDoc(userRef, {
    name: profile.name.trim(),
    identifier: profile.identifier.trim(),
    role: profile.role,
  });
}
