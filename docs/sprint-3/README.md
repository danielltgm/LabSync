# Sprint 3 LabSync — SRS dan pembagian kerja

Versi 1.0 · 18 November 2026 · baseline `main` pada `55da6de`.

**PM: Muhammad Hafidh Zufar Dewantara.** Programmer: Daniel, Agiel, Yudha. Dokumen Sprint 1 dan 2 tetap menjadi riwayat; tabel pembagian Sprint 2 di README lama bukan penugasan Sprint 3.

## Sasaran dan keputusan yang sudah ditetapkan

Praktikan melakukan presensi pada halaman tersendiri dengan **memindai QR sesi dan lolos validasi lokasi**. QR menjadi wajib berdasarkan arahan PM, meskipun bersifat opsional pada soal. Presensi berhasil hanya untuk peserta kelas, sesi `DIBUKA`, QR valid, serta lokasi dalam radius. Rekap dan riwayat Sprint 2 tetap dipakai.

Empat lokasi resmi adalah **LAB AP, LAB B, LAB C, LAB D**. Koordinat akan diberikan PM. Manifest awal berisi `null` dan `enabled: false`; tidak ada koordinat kampus atau radius yang dikarang. Semua marker baru bisa didemonstrasikan setelah koordinat valid tersedia. Belum adanya koordinat merupakan penghalang demo geotag, bukan alasan untuk menerima presensi tanpa lokasi.

FCM wajib digunakan untuk push berbasis peristiwa: sesi dibuka, jadwal diubah, izin diterima, izin ditolak. Perangkat demo **belum ditentukan oleh tim**. Dukungan native, token, kredensial, dan bukti pengiriman harus dikunci pada tahap persiapan; jangan menyebut Expo Push Token atau token APNs sebagai token FCM.

## Penugasan

| Owner | SRS | Hasil utama | Branch usulan |
| --- | --- | --- | --- |
| Daniel | [S3-D](SRS-Daniel.md) | Master lab, pemilihan lab/radius sesi, backend QR dan presensi atomik, rules dan migrasi | `feat/s3-daniel-attendance-backend` |
| Agiel | [S3-A](SRS-Agiel.md) | Halaman presensi terpisah, scanner QR, lokasi perangkat, umpan balik dan integrasi rekap | `feat/s3-agiel-qr-attendance` |
| Yudha | [S3-Y](SRS-Yudha.md) | Maps, aktivitas sekarang/berikutnya, registrasi perangkat dan pengiriman FCM | `feat/s3-yudha-maps`, lalu `feat/s3-yudha-fcm` |
| Hafidh | S3-PM | Fondasi kontrak/config, keputusan perangkat, koordinat/kredensial, review integrasi dan demo | `chore/sprint3-pm-foundation` |

Urutan Yudha: Maps terlebih dahulu agar beban Maps dan notifikasi tidak masuk satu PR besar. PM membantu konfigurasi proyek, build, kredensial, dan pengujian dua akun; implementasi Maps dan FCM tetap tanggung jawab Yudha.

Setiap programmer mencatat ID SRS di commit atau PR. Setelah fitur terintegrasi, Zufar mengerjakan overhaul UI lintas layar dalam satu commit terpisah. Catatan evaluasi dan alur commit selengkapnya ada di [Evaluasi Sprint 2 dan tindak lanjut Sprint 3](evaluasi-sprint-2.md).

## Pemetaan soal ke SRS

| Kebutuhan soal | Penanggung jawab | Acuan verifikasi |
| --- | --- | --- |
| 1. Halaman presensi terpisah + QR pilihan PM | Agiel; Daniel menyediakan QR | A-01–04, D-03 |
| 2. Validasi lokasi saat mencatat presensi | Daniel + Agiel | D-04–06, A-05–07 |
| 3. Lab, koordinat dan radius Firestore | Daniel | D-01–02 |
| 4. Maps interaktif, posisi pengguna hidup | Yudha | Y-01–03 |
| 5. Aktivitas sekarang dan berikutnya dari Firestore | Yudha; Daniel publikasi proyeksi | Y-04, D-07 |
| 6. Empat peristiwa push, penerima relevan | Yudha | Y-05–09 |
| 7. Izin perangkat dan kondisi gagal | Agiel + Yudha | A-03–08, Y-02–03, Y-06–09 |
| Integrasi, keamanan, tiga alur demo | Semua; Hafidh menilai | [Matriks pengujian](testing.md) |

## Batas kepemilikan file

Direktori berikut adalah rencana lokasi implementasi, bukan klaim sudah tersedia.

| Area | Owner utama | Ketentuan |
| --- | --- | --- |
| `src/types/sprint3.ts`, `config/sprint3-labs.json`, `package*.json`, `app*.{json,ts}`, `eas.json` | Hafidh | Perubahan melalui PR kontrak/config; programmer menyampaikan kebutuhan sebelum mengganti |
| `src/server/attendance/`, `src/server/labs/`, `src/app/api/attendance/`, kontrol QR asisten | Daniel | Endpoint dan server otoritatif; token mentah tidak masuk log |
| `src/services/sessionService.ts`, `src/firebase/mutations.ts`, `src/components/manage/`, `firestore.rules`, `firestore.indexes.json` | Daniel | Memiliki perubahan skema sesi, rules dan migrasi; koordinasikan trigger dengan Yudha |
| `src/app/presensi/[id].tsx`, `src/components/presensi/`, `src/services/attendance/`, `src/hooks/use-device-location.ts` | Agiel | Pindahkan entry presensi lama setelah backend siap; tidak mengganti rekap |
| `src/app/maps.tsx`, `src/components/maps/`, `src/services/maps/`, `src/hooks/use-lab-activities.ts` | Yudha | Native Maps dengan fallback web; tidak membaca semua sesi privat |
| `src/services/notifications/`, `functions/` trigger notifikasi | Yudha | Runtime functions terpisah dan exports modular; baca kontrak event Daniel |
| `src/app/_layout.tsx`, `src/app/index.tsx`, `src/context/LabSyncContext.tsx`, `src/firebase/queries.ts` | Bersama, dikoordinasi Hafidh | Satu PR integrasi aktif per file; jangan salin file utuh dari branch lama |

Perubahan UI dalam PR programmer mencakup layar, komponen, dan aksi yang dibutuhkan SRS masing-masing. Overhaul UI lintas layar menjadi tanggung jawab Zufar setelah integrasi fitur. Untuk PR fitur, ikuti kontrak yang berlaku untuk enum `ASISTEN`/`PRAKTISAN`, status sesi, identitas UID, ID presensi `${sessionId}__${uid}`, dan query rekap.

## Urutan kerja dan merge

1. Gabungkan fondasi PM, lalu semua branch fitur dibuat dari `main` terbaru.
2. Daniel menetapkan kontrak server + skema lab/sesi + aturan akses; Agiel dan Yudha boleh mulai komponen memakai fixture bertanda sintetis. Fixture tidak membuktikan integrasi.
3. Daniel merilis endpoint dan perubahan rules bersama jalur presensi baru; Agiel mengganti entry lama. Jangan deploy rules penutup tanpa client pengganti, atau client baru tanpa server.
4. Maps diintegrasikan memakai proyeksi aktivitas aman; Yudha kemudian menyelesaikan FCM dengan proyek/perangkat yang disepakati.
5. Hafidh memeriksa integrasi fitur, termasuk migrasi data lama, lint/typecheck, tes rules/server, dan bukti dua akun.
6. Zufar menggabungkan overhaul UI dalam satu commit terpisah setelah integrasi fitur, lalu tim menguji ulang tiga alur demo pada build perangkat.

Setiap PR menyertakan SRS ID, perubahan perilaku, cara uji beserta hasil aktual, screenshot untuk layar baru, dan keterbatasan. Sebelum review, `git fetch origin` lalu integrasikan `origin/main` memakai merge atau rebase sesuai kebiasaan tim. Periksa konflik bersama owner; jangan memilih seluruh versi sendiri secara otomatis. Tidak ada force push ke `main`.

## Status fondasi dan pekerjaan yang belum selesai

Branch fondasi menyediakan SRS, kontrak TypeScript terpisah, manifest empat lab yang belum aktif, pemeriksa konfigurasi lokal, dan panduan setup. Ini **bukan implementasi fitur Sprint 3 yang sudah selesai**. Endpoint presensi, migrasi/rules baru, kamera, Maps, trigger/pengiriman FCM, dan bukti perangkat menjadi pekerjaan programmer berikutnya.

Lanjut baca [kontrak bersama](contract.md), [setup PM](setup.md), [pengujian fitur](testing.md), dan [hasil verifikasi fondasi](foundation-verification.md). Tidak ada deploy, seed cloud, penggantian role atau pengubahan data tim oleh persiapan ini.
