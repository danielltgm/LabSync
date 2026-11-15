import { createUserWithEmailAndPassword } from 'firebase/auth';

import { firebase } from '@/firebase/client';
import { createUserProfile } from '@/firebase/mutations';
import { validateRegistrationInput, type RegistrationInput } from '@/validations/registration.schema';

export interface RegistrationResult {
  success: boolean;
  uid?: string;
  error?: string;
  fieldErrors?: Partial<Record<keyof RegistrationInput, string>>;
}

/**
 * Mendaftarkan akun baru ke Firebase Auth dan membuat dokumen profil
 * di Firestore (users/{uid}) dengan role yang diprovisioning.
 */
export async function registerAccount(input: RegistrationInput): Promise<RegistrationResult> {
  const validation = validateRegistrationInput(input);
  if (!validation.isValid) {
    return {
      success: false,
      error: 'Data pendaftaran belum valid.',
      fieldErrors: validation.errors,
    };
  }

  if (!firebase) {
    return {
      success: false,
      error: 'Firebase belum terkonfigurasi.',
    };
  }

  try {
    const credential = await createUserWithEmailAndPassword(
      firebase.auth,
      input.email.trim(),
      input.password
    );

    const uid = credential.user.uid;

    await createUserProfile(firebase.db, uid, {
      name: input.name.trim(),
      identifier: input.identifier.trim(),
      role: input.role,
    });

    return {
      success: true,
      uid,
    };
  } catch (error: unknown) {
    const errorCode = (error as { code?: string }).code;
    let message = 'Pendaftaran akun gagal. Silakan coba lagi.';

    if (errorCode === 'auth/email-already-in-use') {
      message = 'Email ini sudah terdaftar. Silakan login atau gunakan email lain.';
    } else if (errorCode === 'auth/invalid-email') {
      message = 'Format email tidak valid.';
    } else if (errorCode === 'auth/weak-password') {
      message = 'Kata sandi terlalu lemah. Gunakan minimal 6 karakter.';
    } else if (errorCode === 'auth/network-request-failed') {
      message = 'Koneksi jaringan gagal. Periksa koneksi internet Anda.';
    }

    return {
      success: false,
      error: message,
    };
  }
}
