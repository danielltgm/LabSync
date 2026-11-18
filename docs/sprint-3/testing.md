# Pengujian dan bukti penerimaan Sprint 3

Semua baris di bawah masih **belum diuji sebagai fitur Sprint 3** pada branch fondasi. Hasil pemeriksa konfigurasi bukan bukti endpoint, Maps atau FCM sudah berfungsi. Isi hasil aktual, tanggal, commit, perangkat dan penguji pada PR fitur.

## Tes otomatis

```sh
npm run lint
npm run typecheck
npm run test:views
npm run test:foundation
npm run test:rules
```

`test:foundation` hanya menguji manifest/kebijakan fondasi. `test:rules` existing adalah regresi Sprint 2; Daniel harus memperbarui dan menambah skenario Sprint 3 sebelum menutup direct write presensi. Tes browser existing memerlukan emulator, seed dan Expo web sesuai README; jalankan ketika entry/navigasi lama diubah. Tambahkan tes endpoint/transaksi, seleksi aktivitas dan event/penerima FCM pada PR masing-masing; jangan mengandalkan pencarian teks source sebagai bukti keamanan.

## Matriks penerimaan

| Kasus | Ekspektasi | Owner | Bukti minimum |
| --- | --- | --- | --- |
| QR sah + peserta + sesi buka + dalam radius | Satu presensi tersimpan, rekap asisten realtime | Daniel/Agiel | Perangkat asli + record/query |
| Jarak tepat batas dan sedikit di luar | Batas diterima, luar ditolak tanpa dokumen | Daniel | Tes server terkontrol + lapangan |
| QR asing/expired/sesi lain/dicabut | Ditolak tanpa presensi | Daniel/Agiel | Tes endpoint + feedback |
| Sesi ditutup ketika scan/commit | Tidak ada presensi baru | Daniel/Agiel | Tes race transaksi |
| Dua permintaan bersamaan/retry setelah commit | Satu ID deterministik; hasil already-recorded | Daniel | Tes concurrent endpoint |
| Nonpeserta/akun lain/asisten asing | Akses/aksi tidak sah ditolak | Daniel | Auth + rules/API negatif |
| Client menulis attendance langsung | Ditolak walau field tampak lengkap | Daniel | Rules emulator negatif |
| Lab null/nonaktif/policy kosong | Fail closed dengan keterangan | Daniel/Agiel | Tes server + UI |
| Kamera/GPS denied atau layanan mati | Petunjuk izin/pengaturan; tidak hadir otomatis | Agiel | Perangkat asli |
| Fix stale/inaccurate/out-of-range/NaN | Ditolak/ambil ulang; tidak ada record sukses | Daniel/Agiel | Tes validasi + UI |
| Jaringan putus sebelum/sesudah commit | Tidak sukses palsu, retry idempoten | Daniel/Agiel | Uji jaringan + record |
| Sesi lama tanpa lab, presensi/izin lama | Riwayat tetap terbaca; check-in baru wajib konfigurasi | Daniel/Hafidh | Migrasi dry run + regresi |
| Empat lab dan gerak marker pengguna | Marker benar, update saat aktif, watcher bersih | Yudha | Perangkat dan koordinat resmi |
| Marker dipilih, jadwal/status berubah | Detail current/next ikut berubah realtime | Yudha/Daniel | Dua akun + snapshot |
| Tengah malam, jadwal overlap, tepat jam selesai | Hasil konsisten Asia/Jakarta, end eksklusif | Yudha | Tes waktu terkontrol |
| GPS ditolak saat Maps / web fallback | Daftar/detail tersedia, tidak crash | Yudha | Uji platform |
| Sesi dibuka → push | Hanya peserta kelas terkait menerima | Yudha | FCM remote, dua kelas |
| Jadwal materiil diubah → push | Penerima kelas terkait, bukan event pembukaan ganda | Yudha | FCM remote + eventId |
| Izin approved → push | Hanya pemohon menerima; tap ke izin sah | Yudha | Dua akun/perangkat |
| Izin rejected → push | Hanya pemohon menerima; alasan privat tidak bocor | Yudha | Dua akun/perangkat |
| No-op / update AI / trigger berulang | Tidak menciptakan event baru yang sama | Yudha | Tes before/after + retry |
| Token invalid, logout, refresh, ganti akun | Token ditangani, tidak menerima akun lama | Yudha | Tes lifecycle + perangkat |
| Push ditolak/gagal diterima | Aplikasi tetap dipakai dan status dapat dilihat | Yudha | Perangkat + kegagalan server |
| Foreground/background/cold start | Notifikasi/tap ditangani dan akses dicek ulang | Yudha | Build native platform terpilih |

## Tiga demo akhir

1. **Presensi:** asisten memilih lab/radius dan membuka sesi; praktikan membuka halaman khusus, scan QR, lokasi diperiksa server; satu presensi masuk rekap. Lanjutkan contoh luar radius dan duplikat yang tidak menambah dokumen.
2. **Maps:** pengguna melihat empat marker dan posisi sendiri, bergerak, memilih lab, melihat aktivitas sekarang/berikutnya. Asisten mengubah jadwal/status pada perangkat lain; detail berubah tanpa refresh.
3. **Notifikasi:** empat event dilakukan dari aplikasi, trigger server mengirim FCM, perangkat penerima yang berhak menerima; akun kelas lain tidak menerima. Tap membuka tujuan sah. Tunjukkan satu skenario notifikasi ditolak dan aplikasi tetap berfungsi.

Sprint selesai hanya setelah ketiganya dapat didemonstrasikan dengan data Firestore konsisten dan semua kebutuhan wajib diterima PM. Catat kasus yang belum dicoba sebagai belum diuji, bukan lulus. Laporan dan rekaman demo memakai data sintetis serta menyamarkan token/credential.
