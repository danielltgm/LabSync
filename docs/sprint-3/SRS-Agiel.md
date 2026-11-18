# SRS S3-A — Agiel

**Modul:** halaman presensi QR dan geotag. **PM:** Muhammad Hafidh Zufar Dewantara. Status: rencana implementasi; fondasi tidak menambah layar ini.

## Tujuan dan batas kerja

Praktikan membuka halaman presensi khusus, melihat sesi, memindai QR asisten, memperoleh lokasi terkini, lalu menerima hasil server. Komponen recap/history, pengajuan izin dan keputusan asisten Sprint 2 tetap digunakan. Tidak ada tombol presensi tanpa QR atau fallback hadir otomatis ketika GPS gagal.

## Kebutuhan fungsional dan kriteria terima

| ID | Sistem harus | Kriteria terima |
| --- | --- | --- |
| A-01 | Menyediakan route `presensi/[id]` terpisah dari detail sesi | Entry dari kartu/detail sesi menuju halaman baru; tampil nama praktikum, kelas, waktu, lab/radius, status sesi dan status presensi akun sendiri |
| A-02 | Mengikuti perubahan sesi dan presensi secara realtime | Sesi selesai menonaktifkan aksi; rekaman yang sudah ada ditampilkan; tidak meminta scan ulang untuk membaca status; cleanup listener saat keluar/logout |
| A-03 | Meminta izin kamera saat pengguna memulai scan | Jelaskan kegunaan; ditolak/tidak bisa meminta ulang ditangani dengan petunjuk pengaturan; tidak meminta mikrofon; kamera dilepas saat halaman tidak aktif |
| A-04 | Memindai dan memvalidasi format QR LabSync | Hanya format versi didukung; sesi QR harus sesuai halaman; scan berulang dibatasi ketika proses berlangsung; QR kosong, asing, salah sesi dan expired menampilkan tindakan pemulihan |
| A-05 | Meminta izin lokasi foreground dan lokasi terkini | Tangani denied, layanan mati, timeout, null, akurasi buruk dan data lama; tawarkan ambil ulang lokasi; tidak menggunakan lokasi cache tanpa pemeriksaan usia |
| A-06 | Menampilkan hasil pemeriksaan lokasi sebagai bantuan | Tampilkan lab, radius dan kondisi lokasi; hasil client bersifat perkiraan; keputusan berhasil hanya setelah respons server, tidak dari perbandingan lokal |
| A-07 | Mengirim check-in ke server otoritatif | Kirim sessionId, challengeId, QR token dan location fix sesuai kontrak; Firebase ID token pada header; tidak menulis attendance langsung dan tidak mengirim UID/NIM sebagai sumber identitas |
| A-08 | Memberikan feedback pasti untuk setiap kondisi | Loading, berhasil, sudah presensi, luar radius, sesi tertutup, QR invalid/expired, lokasi belum siap, tidak berhak, dan jaringan gagal dibedakan; retry aman dan tidak menampilkan sukses optimistis |
| A-09 | Menyambungkan hasil ke riwayat/rekap Sprint 2 | Presensi akun sendiri tampil pada riwayat, asisten pemilik melihat hasil baru tanpa refresh; hasil backend memakai ID lama sehingga tidak menggandakan entri |

## Alur dan keadaan layar

`memuat sesi → siap scan → meminta kamera → QR terbaca → meminta/memperbarui lokasi → mengirim → berhasil / sudah tercatat / gagal dengan tindakan`.

Pengguna boleh memperbarui lokasi sebelum scan; saat mengirim, fix tetap harus memenuhi batas usia server. Setelah scan, jangan menyimpan token QR di AsyncStorage, analytics atau log. Bila QR kedaluwarsa ketika lokasi diperoleh, minta scan QR terbaru. Jika jaringan putus sesudah pengiriman, cek status milik sendiri atau retry; jangan menyimpulkan gagal commit.

Informasi sesi tidak ditemukan/akses ditolak ditampilkan terpisah dari data yang masih loading. Menolak notifikasi tidak menghalangi presensi; menolak kamera/lokasi menghalangi pengiriman presensi dan diberi alasan. Web boleh memberikan petunjuk untuk memakai perangkat yang didukung; jangan mengimpor Maps native pada web atau menganggap web membuktikan FCM native.

## File dan dependensi

Owner: `src/app/presensi/[id].tsx`, `src/components/presensi/`, `src/services/attendance/`, hook lokasi. `AttendanceFormModal`, `SessionPraktikanCard`, beranda/context/queries lama perlu koordinasi dengan Daniel/Hafidh. Hilangkan entry lama dalam PR integrasi setelah endpoint pengganti siap; jangan sekadar menyembunyikan tombol lama sementara direct write masih terbuka.

Gunakan versi `expo-camera`/`expo-location` yang dipasang melalui `npx expo install` untuk SDK repo. Native API dan permission harus mengikuti dokumentasi SDK 58. Data fixture ditandai sintetis dan tidak dipakai sebagai koordinat lab riil. Daniel menyediakan respons endpoint dan snapshot konfigurasi; Yudha boleh berbagi helper lokasi melalui kontrak tanpa saling mengubah hook pada saat bersamaan.

## Pengujian dan Definition of Done

Uji perangkat: izinkan kamera/lokasi, tolak keduanya, layanan lokasi mati, QR salah sesi/expired, pindah luar radius, lokasi belum dikonfigurasi, jaringan hilang, double tap/scan, retry dan logout saat listener aktif. Sesi ditutup oleh akun asisten lain di perangkat kedua harus mengubah layar dan ditolak server bila masih dikirim.

Semua A-01–09 diterima; lint/typecheck dan tes relevan lulus; tidak ada direct write presensi dari client; bukti akun praktikan → QR+geo → satu record → rekap asisten. Lampirkan hasil nyata dan screenshot layar baru. Uji mock kamera/GPS hanya mendukung tes otomatis, bukan pengganti demo perangkat.
