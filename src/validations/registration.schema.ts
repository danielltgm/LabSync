import type { UserRole } from '@/types/user';

export interface RegistrationInput {
  name: string;
  identifier: string;
  email: string;
  password: string;
  role: UserRole;
}

export interface ValidationResult {
  isValid: boolean;
  errors: Partial<Record<keyof RegistrationInput, string>>;
}

export function validateRegistrationInput(input: RegistrationInput): ValidationResult {
  const errors: Partial<Record<keyof RegistrationInput, string>> = {};

  const name = input.name?.trim() ?? '';
  if (!name) {
    errors.name = 'Nama lengkap wajib diisi.';
  } else if (name.length < 2) {
    errors.name = 'Nama lengkap minimal 2 karakter.';
  }

  const identifier = input.identifier?.trim() ?? '';
  if (!identifier) {
    errors.identifier = input.role === 'ASISTEN' ? 'Kode asisten wajib diisi.' : 'NIM wajib diisi.';
  } else if (identifier.length < 3) {
    errors.identifier = input.role === 'ASISTEN' ? 'Kode asisten minimal 3 karakter.' : 'NIM minimal 3 karakter.';
  }

  const email = input.email?.trim() ?? '';
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email) {
    errors.email = 'Email wajib diisi.';
  } else if (!emailRegex.test(email)) {
    errors.email = 'Format email tidak valid.';
  }

  const password = input.password ?? '';
  if (!password) {
    errors.password = 'Kata sandi wajib diisi.';
  } else if (password.length < 6) {
    errors.password = 'Kata sandi minimal 6 karakter.';
  }

  if (input.role !== 'ASISTEN' && input.role !== 'PRAKTISAN') {
    errors.role = 'Peran harus ASISTEN atau PRAKTISAN.';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}
