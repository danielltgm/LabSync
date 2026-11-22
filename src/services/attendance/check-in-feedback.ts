import type { CheckInErrorCode } from '../../types/sprint3';
import type { CheckInOutcome } from './check-in-client';

export type FeedbackTone = 'success' | 'info' | 'warning' | 'danger';
export type RecoveryAction =
  | 'none'
  | 'rescan-qr'
  | 'refresh-location'
  | 'retry-submit'
  | 'back-to-home'
  | 'relogin';

export interface CheckInFeedbackView {
  title: string;
  message: string;
  tone: FeedbackTone;
  recoveryAction: RecoveryAction;
  recoveryLabel?: string;
}

const ERROR_FEEDBACK: Record<CheckInErrorCode, CheckInFeedbackView> = {
  AUTH_REQUIRED: {
    title: 'Sesi Login Berakhir',
    message: 'Token akun tidak valid atau kedaluwarsa. Silakan masuk kembali.',
    tone: 'danger',
    recoveryAction: 'relogin',
    recoveryLabel: 'Kembali ke Login',
  },
  FORBIDDEN: {
    title: 'Akses Presensi Ditolak',
    message: 'Akun Anda tidak terdaftar sebagai peserta pada kelas praktikum ini.',
    tone: 'danger',
    recoveryAction: 'back-to-home',
    recoveryLabel: 'Kembali ke Jadwal',
  },
  SESSION_NOT_FOUND: {
    title: 'Sesi Tidak Ditemukan',
    message: 'Data sesi praktikum tidak tersedia lagi di server.',
    tone: 'danger',
    recoveryAction: 'back-to-home',
    recoveryLabel: 'Kembali ke Jadwal',
  },
  SESSION_CLOSED: {
    title: 'Sesi Sudah Ditutup',
    message: 'Asisten telah menutup sesi ini. Presensi tidak lagi diterima.',
    tone: 'warning',
    recoveryAction: 'back-to-home',
    recoveryLabel: 'Kembali ke Jadwal',
  },
  LAB_NOT_CONFIGURED: {
    title: 'Lokasi Lab Belum Aktif',
    message: 'Koordinat resmi laboratorium belum dikonfigurasi. Hubungi asisten atau PM.',
    tone: 'warning',
    recoveryAction: 'back-to-home',
    recoveryLabel: 'Kembali ke Jadwal',
  },
  POLICY_NOT_CONFIGURED: {
    title: 'Kebijakan Presensi Belum Aktif',
    message: 'Aturan validasi server belum dikonfigurasi. Hubungi asisten atau PM.',
    tone: 'warning',
    recoveryAction: 'back-to-home',
    recoveryLabel: 'Kembali ke Jadwal',
  },
  QR_INVALID: {
    title: 'QR Tidak Valid',
    message: 'QR tidak dikenali atau tidak sesuai sesi ini. Pindai ulang QR dari layar asisten.',
    tone: 'danger',
    recoveryAction: 'rescan-qr',
    recoveryLabel: 'Scan QR Ulang',
  },
  QR_EXPIRED: {
    title: 'QR Kedaluwarsa',
    message: 'Masa berlaku QR telah habis. Minta dan pindai QR terbaru dari layar asisten.',
    tone: 'warning',
    recoveryAction: 'rescan-qr',
    recoveryLabel: 'Scan QR Terbaru',
  },
  LOCATION_INVALID: {
    title: 'Lokasi Tidak Valid',
    message: 'Koordinat GPS perangkat tidak valid. Ambil ulang lokasi terkini.',
    tone: 'danger',
    recoveryAction: 'refresh-location',
    recoveryLabel: 'Ambil Ulang Lokasi',
  },
  LOCATION_STALE: {
    title: 'Lokasi Sudah Kedaluwarsa',
    message: 'Data GPS terlalu lama untuk diverifikasi. Ambil ulang lokasi terbaru.',
    tone: 'warning',
    recoveryAction: 'refresh-location',
    recoveryLabel: 'Perbarui Lokasi GPS',
  },
  LOCATION_INACCURATE: {
    title: 'Akurasi GPS Kurang Memadai',
    message: 'Sinyal GPS terlalu melebar. Cari sinyal lebih baik lalu ambil ulang lokasi.',
    tone: 'warning',
    recoveryAction: 'refresh-location',
    recoveryLabel: 'Ambil Ulang Lokasi',
  },
  OUTSIDE_RADIUS: {
    title: 'Di Luar Radius Laboratorium',
    message: 'Posisi Anda berada di luar radius presensi lab. Dekati ruang lab lalu ambil ulang lokasi.',
    tone: 'danger',
    recoveryAction: 'refresh-location',
    recoveryLabel: 'Ambil Ulang Lokasi',
  },
  RATE_LIMITED: {
    title: 'Terlalu Banyak Percobaan',
    message: 'Tunggu beberapa detik sebelum mencoba mengirim presensi lagi.',
    tone: 'warning',
    recoveryAction: 'retry-submit',
    recoveryLabel: 'Coba Kirim Lagi',
  },
  SERVICE_UNAVAILABLE: {
    title: 'Layanan Sedang Tidak Tersedia',
    message: 'Server presensi sedang sibuk atau belum siap. Coba lagi beberapa saat.',
    tone: 'warning',
    recoveryAction: 'retry-submit',
    recoveryLabel: 'Coba Kirim Lagi',
  },
};

export function resolveCheckInFeedback(outcome: CheckInOutcome): CheckInFeedbackView {
  if (outcome.kind === 'success') {
    const isRepeat = outcome.data.status === 'already-recorded';
    return {
      title: isRepeat ? 'Presensi Sudah Tercatat' : 'Presensi Berhasil Dicatat',
      message: isRepeat
        ? `Kehadiran Anda telah tercatat sebelumnya (jarak ${Math.round(outcome.data.distanceMeters)} m / radius ${outcome.data.radiusMeters} m).`
        : `Kehadiran terverifikasi server (jarak ${Math.round(outcome.data.distanceMeters)} m / radius ${outcome.data.radiusMeters} m).`,
      tone: 'success',
      recoveryAction: 'none',
    };
  }

  if (outcome.kind === 'auth-missing') {
    return ERROR_FEEDBACK.AUTH_REQUIRED;
  }

  if (outcome.kind === 'network-error') {
    return {
      title: 'Gangguan Koneksi Jaringan',
      message: outcome.message,
      tone: 'warning',
      recoveryAction: 'retry-submit',
      recoveryLabel: 'Coba Kirim Lagi',
    };
  }

  if (outcome.code !== 'UNKNOWN') {
    return ERROR_FEEDBACK[outcome.code];
  }

  return {
    title: 'Presensi Gagal',
    message: outcome.message,
    tone: 'danger',
    recoveryAction: 'retry-submit',
    recoveryLabel: 'Coba Kirim Lagi',
  };
}
