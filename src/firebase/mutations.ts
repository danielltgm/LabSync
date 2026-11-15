import { doc, setDoc, type Firestore } from 'firebase/firestore';

import type { UserDocument } from '@/types/sprint2';

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
