import type { LiveLeaveRequest } from '../types/leave-request';

export const leaveDecisionLabels = {
  pending: 'Menunggu review', approved: 'Izin diterima', rejected: 'Izin ditolak',
} as const;

export function formatLeaveDateTime(milliseconds: number | null) {
  return milliseconds === null ? 'Menunggu sinkronisasi' : new Date(milliseconds).toLocaleString('id-ID', {
    timeZone: 'Asia/Jakarta', year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: false,
  });
}

export function classificationLabel(classification: LiveLeaveRequest['classification']) {
  if (classification.status === 'classified') return `Kategori AI: ${classification.category}`;
  return classification.status === 'pending' ? 'Klasifikasi AI sedang diproses' : 'Klasifikasi AI belum tersedia';
}

export function leaveReviewErrorMessage(error: unknown) {
  if (error instanceof Error && error.message === 'already-reviewed') {
    return 'Pengajuan ini sudah direview. Keputusan terbaru akan ditampilkan; keputusan sebelumnya tidak diubah.';
  }
  if (error instanceof Error && error.message === 'request-not-found') return 'Pengajuan sudah tidak tersedia.';
  if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'permission-denied') {
    return 'Anda tidak memiliki akses untuk mereview izin ini. Muat ulang data atau hubungi pengelola.';
  }
  return 'Keputusan belum berhasil disimpan. Periksa koneksi lalu coba lagi.';
}
