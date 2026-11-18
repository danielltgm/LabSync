# SRS S3-Y — Yudha

**Modul:** Maps/aktivitas laboratorium dan FCM. **PM:** Muhammad Hafidh Zufar Dewantara. Kerjakan dalam dua PR berurutan: Maps lalu notifikasi; PM membantu setup build dan kredensial.

## Kebutuhan Maps dan aktivitas

| ID | Sistem harus | Kriteria terima |
| --- | --- | --- |
| Y-01 | Menyediakan halaman Maps dari navigasi aplikasi | Empat lab dikonsumsi dari Firestore, marker hanya untuk koordinat valid/aktif; lab belum tersedia ditampilkan sebagai daftar/status, bukan marker di titik buatan |
| Y-02 | Menampilkan lokasi pengguna selama halaman aktif | Permission foreground diminta sesuai kebutuhan; marker mengikuti update lokasi; subscription dihentikan saat blur/unmount/logout/background dan dipulihkan saat aktif |
| Y-03 | Menangani kegagalan Maps/lokasi | Permission denied, layanan mati, loading, timeout, API key/error peta dan jaringan diberi informasi; daftar lab tetap dapat dibaca bila lokasi pengguna gagal; fallback web tidak crash |
| Y-04 | Menampilkan aktivitas sekarang dan berikutnya saat marker dipilih | Tampil nama praktikum, kelas, waktu Asia/Jakarta dan status dari proyeksi Firestore; update jadwal/status langsung tercermin; tampil empty state tanpa data; tidak memakai jadwal hardcoded |

Definisi aktivitas: gunakan waktu absolut `startsAt`/`endsAt` yang diturunkan dari tanggal/jam Sprint 2 dalam zona `Asia/Jakarta`. Aktivitas sekarang memenuhi `startsAt <= now < endsAt` dan belum `SELESAI`; label status tetap `TERJADWAL`/`DIBUKA`. Aktivitas berikutnya adalah waktu mulai terdekat `> now` yang belum selesai. Bila jadwal bertumpuk, tampilkan seluruh aktivitas sekarang, lalu urutkan berdasarkan mulai dan sessionId; jangan memilih satu secara acak. Jalankan timer saat melewati batas waktu walau tidak ada snapshot baru. Batasi query rentang hari dengan informasi eksplisit saat belum ada jadwal berikutnya dalam rentang; jangan mengklaim tidak ada jadwal selamanya.

Maps membaca `labs` dan proyeksi `labActivities`, bukan query global `sessions` yang saat ini privat menurut enrollment. Tidak tampilkan UID peserta, token atau alasan izin. Daniel membuat proyeksi; Yudha merancang query/indeks bersama Daniel. Jangan melonggarkan semua rules sesi untuk membuat peta berfungsi.

## Kebutuhan FCM

| ID | Sistem harus | Kriteria terima |
| --- | --- | --- |
| Y-05 | Mengirim notifikasi berdasarkan empat peristiwa server | `session.opened`: peserta kelas; `schedule.changed`: peserta kelas pada perubahan materiil; `leave.approved`/`leave.rejected`: hanya pemohon; perubahan AI/metadata dan no-op tidak memicu push |
| Y-06 | Meminta izin dan meregistrasikan token perangkat milik user | Penolakan tidak memblokir aplikasi; Android channel disiapkan sebelum registrasi; token refresh, login, logout, ganti akun dan token invalid ditangani; token tidak dapat dibaca user lain |
| Y-07 | Menggunakan transport dan kredensial yang tepat | Android: token native FCM, Firebase Admin/HTTP v1 di server; ExpoPushToken tidak dikirim ke Admin FCM. Jika iOS ikut demo FCM, perlu adapter SDK yang menghasilkan token FCM dan setup APNs di Firebase, bukan memakai token APNs sebagai FCM |
| Y-08 | Memproses event dengan deduplikasi dan retry terukur | Event ID deterministik/revision, outbox dan status per penerima/perangkat; trigger duplikat tidak membuat job baru; batasi retry/backoff; hapus/nonaktifkan token invalid; kegagalan push tidak membatalkan pembukaan sesi atau keputusan izin |
| Y-09 | Menangani penerimaan dan tap secara aman | Foreground, background dan cold start diuji; tap menuju sesi/izin yang benar setelah login/cek hak akses; payload hanya ID dan teks umum; jangan bocorkan alasan izin atau informasi akun sebelumnya |

## Alur event dan penerima

1. Perubahan sah pada sesi/jadwal/keputusan izin tersimpan di Firestore.
2. Trigger server membandingkan before/after dan membuat event/outbox dengan eventId stabil. Jangan mengirim push langsung dari tombol client.
3. Server memperoleh daftar peserta dari enrollment otoritatif. Karena struktur saat ini `enrollments/{uid}/classes/{classId}`, sepakati collection-group query atau indeks anggota server; jangan menganggap sudah ada daftar UID pada dokumen kelas. Uji query tersebut beserta indeks dan pencabutan enrollment.
4. Worker mengirim ke token aktif pemilik penerima, menandai hasil per perangkat, lalu menangani invalid token/retry. Validasi penerima kembali sebelum pengiriman untuk mencegah pengiriman setelah enrollment dicabut atau token berpindah akun.
5. Aplikasi menampilkan notifikasi dan menavigasi secara sah. Bila notifikasi ditolak/tidak terkirim, jadwal/status izin tetap dapat dibuka dari aplikasi dan informasi kegagalan registrasi ditampilkan.

Perubahan jadwal materiil: tanggal, jam, lab/radius yang relevan, nama praktikum/kelas. `TERJADWAL → DIBUKA` menghasilkan event pembukaan, bukan notifikasi jadwal ganda. Keputusan `pending → approved/rejected` menghasilkan satu event keputusan; update klasifikasi AI tidak boleh mengirim ulang. Gunakan kontrak revision dengan Daniel.

FCM dan trigger tidak menjamin pengiriman tepat satu kali atau urutan mutlak. Crash antara provider menerima kiriman dan pencatatan hasil bisa menghasilkan duplikat. Gunakan eventId pada payload dan dedupe client untuk mengurangi duplikasi; jangan menjanjikan exactly-once.

## Setup dan file

`src/app/maps.tsx`, komponen/hook Maps dan `src/services/notifications/` dimiliki Yudha. Trigger notifikasi berada di `functions/` dengan runtime tersendiri; pin dependency/runtime dari dokumentasi Firebase saat implementasi. Jangan menyalin versi Node root secara otomatis ke Cloud Functions. Hafidh mengatur perubahan `firebase.json`, app config, EAS dan env bersama owner; izin/rules token dikoordinasi dengan Daniel. SDK Admin tetap server-only.

Perangkat demo belum ditentukan. Mulai UI/adapter tanpa mengarang bundle ID, package ID, EAS projectId atau kredensial. Development build diperlukan untuk membuktikan push native; Expo Go, notifikasi lokal dan Firebase emulator tidak menjadi bukti FCM end-to-end. Lihat [setup.md](setup.md).

## Pengujian dan Definition of Done

Uji empat marker setelah koordinat tersedia, pergerakan marker, cleanup watcher, perubahan sesi realtime, pergantian hari/jam dan jadwal tumpang tindih. Uji empat event pada dua user kelas berbeda, pemohon izin yang benar, no-op/AI update, trigger berulang, token invalid, logout/ganti akun, foreground/background/cold start dan tap tanpa akses.

Semua Y-01–09 diterima; lint/typecheck serta tes query/event/otorisasi lulus; bukti penerimaan remote FCM pada perangkat terdaftar disertakan untuk keempat event. Simulasi server hanya membuktikan logika, bukan bahwa perangkat menerima push.
