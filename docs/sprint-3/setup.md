# Setup PM dan programmer Sprint 3

## Yang disiapkan pada branch fondasi

SRS tiap owner, kontrak bersama, manifest empat lab nonaktif, usulan kebijakan awal, pilihan perangkat yang masih kosong, pemeriksa lokal, tes konfigurasi, template PR dan workflow pemeriksaan GitHub. UI, aturan Firestore dan perilaku presensi Sprint 2 tidak diubah oleh fondasi ini. Modul native dipasang untuk memudahkan pekerjaan berikutnya; fitur belum terhubung ke layar.

## Mulai dari baseline yang sama

Sesudah fondasi masuk `main`, masing-masing anggota menjalankan:

```sh
git switch main
git pull --ff-only origin main
npm ci
npm run sprint3:check
npm run test:foundation
npm run typecheck
npm run lint
git switch -c feat/s3-nama-modul
```

Gunakan Node 24 LTS minimal 24.12 sesuai SDK Firebase repo. Tidak perlu menghapus clone Sprint 2 atau branch anggota lain. Ikuti pemilik file pada README Sprint 3. Jika fondasi belum di-merge, review branch fondasi dahulu; jangan mulai fitur dari branch Sprint 2 lama.

`sprint3:check` memeriksa struktur konfigurasi lokal dan melaporkan bagian kosong. Exit 0 pada mode biasa berarti struktur fondasi valid, **bukan fitur siap demo**. `npm run sprint3:check -- --strict` gagal sampai konfigurasi lab, policy, platform dan env minimum terisi. Pemeriksa tidak login, tidak menghubungi cloud, tidak membuktikan kredensial aktif, dan tidak menulis data.

Workflow `.github/workflows/checks.yml` menjalankan lint, typecheck, tes view dan fondasi pada PR/push `main` setelah berkas dipublikasikan. Belum ada run GitHub dari persiapan lokal ini; rules, native build dan uji perangkat tetap gate terpisah. Workflow memakai [checkout](https://github.com/actions/checkout) dan [setup-node](https://github.com/actions/setup-node) versi major 7 sesuai panduan upstream saat persiapan.

## Firebase tim dan emulator

Untuk development bersama, pakai Firebase existing yang disetujui PM, saat ini README mengarah ke `labsync-sprint2-dev`. `EXPO_PUBLIC_FIREBASE_EMULATORS=false`; isi config client dari PM pada `.env.local`. Emulator opsional untuk tes terisolasi/rules, bukan syarat penggunaan aplikasi cloud. Jangan mencampur akun emulator dengan akun cloud. `.env.sprint3.example` adalah tambahan konfigurasi build, bukan pengganti seluruh `.env.local` lama.

Operator yang punya akses Firebase memeriksa target sebelum migrasi/deploy:

```sh
npx -y firebase-tools@latest login
npx -y firebase-tools@latest firestore:databases:list --project labsync-sprint2-dev
npx -y firebase-tools@latest firestore:databases:get '(default)' --project labsync-sprint2-dev
```

Pastikan instance/edition dan target yang sudah ada; jangan buat database baru. Sesi CLI di mesin persiapan belum terautentikasi, sehingga edition/cloud rules belum diverifikasi. Tes rules memakai project `demo-labsync` lokal dan Java 21+, tidak mengubah cloud. Jangan memakai akun praktikan untuk CLI pengelola proyek.

## Keputusan dan data yang harus dilengkapi Hafidh

| Kebutuhan | Status awal | Langkah berikutnya |
| --- | --- | --- |
| Koordinat LAB AP/B/C/D | Menunggu PM | Isi `config/sprint3-labs.json`; angka sah dan titik diverifikasi di lokasi; version naik saat koordinat berubah |
| Radius sesi | Dipilih asisten pada implementasi Daniel | Positif dalam meter, uji di lab; tidak mengarang angka default dari manifest |
| TTL QR, usia/akurasi GPS, toleransi jam | Usulan awal: 60 detik / 30 detik / 30 meter / 5 detik | Evaluasi saat uji lapangan, ubah version bila policy berubah; Daniel menerapkan policy server, bukan mempercayai client |
| Platform demo | Belum ditentukan user | Isi `demoPlatforms` dengan `android`, `ios`, atau keduanya; pilih dan uji perangkat fisik |
| Package ID/bundle ID | Belum ditetapkan | Daftarkan app native pada Firebase existing dan masukkan env build; jangan menebak ID |
| Native Firebase/Maps credential | Belum diperoleh | File konfigurasi harus sesuai app/project; keys Maps dibatasi package/SHA-1 atau bundle ID dan API yang dipakai |
| Server HTTPS untuk native | Belum ditetapkan | Deploy server API saat implementasi siap dan set origin Expo Router sesuai dokumentasi; localhost bukan URL perangkat tim |
| Runtime trigger + billing/IAM | Belum diperiksa | Yudha/PM memeriksa syarat Cloud Functions dan FCM pada proyek; jangan deploy atau mengaktifkan billing diam-diam |

Manifest hanya berisi data lokal. Tidak ada seed otomatis ke cloud. Daniel menyiapkan import/migrasi terpisah dengan dry run, pemeriksaan target dan pembacaan data existing. Jangan menjalankan seed Sprint 2 cloud untuk menambah lab tanpa meninjau efek lain.

## Native build dan FCM

Fondasi memasang `expo-camera`, `expo-location`, `react-native-maps`, `expo-notifications`, `expo-dev-client` memakai installer Expo SDK 58. Config plugin kamera/lokasi memakai izin foreground; tidak meminta audio atau background location. `eas.json` menyediakan profil development untuk nanti; belum terikat akun/proyek Expo dan belum ada build yang dijalankan.

1. Tetapkan platform dan identitas app. Tambahkan konfigurasi native/Maps pada app config dalam PR config dengan PM. Unduh `google-services.json` untuk Android yang tepat dan, jika diperlukan, plist untuk iOS; simpan file melalui mekanisme build privat. Contoh env tidak otomatis diterapkan ke app config pada fondasi ini.
2. **Android FCM:** `expo-notifications.getDevicePushTokenAsync()` memberikan token native FCM. Pasang konfigurasi Firebase Android dan izin/channel, kirim token melalui API registrasi pemilik. Backend memakai Firebase Admin/FCM HTTP v1 dengan IAM yang sah.
3. **iOS bila dipilih:** native token Expo Notifications adalah APNs. Untuk tetap memakai FCM pada iOS, Yudha menambahkan adapter messaging yang menghasilkan token FCM, config plugin kompatibel Expo SDK, dan kredensial APNs pada Firebase. Ini memerlukan PR dependency/config tambahan dan uji iPhone; tidak dinyatakan selesai hanya karena Android bekerja.
4. Siapkan development build, misalnya `npx eas-cli@latest build --profile development --platform android` setelah akun/identitas/kredensial ditetapkan, atau local build dengan native toolchain. Build cloud belum dimulai oleh fondasi ini.
5. Install build di perangkat tim lalu jalankan `npm run start:dev-client`. Native dependency/config berubah berarti perlu build ulang. Expo Go dan browser tetap dapat dipakai untuk bagian Sprint 2 yang sesuai, tetapi bukan bukti push FCM native. Jangan menjalankan remote notification API pada platform yang belum didukung.
6. Uji empat event dengan dua akun yang relevan, catat penerimaan foreground/background/cold start. Simpan eventId, waktu dan status umum, tanpa raw token/password/lokasi presisi dalam laporan publik.

Referensi: [development builds Expo](https://docs.expo.dev/develop/development-builds/introduction/), [Notifications SDK 58](https://docs.expo.dev/versions/v58.0.0/sdk/notifications/), [Google Maps native config](https://docs.expo.dev/versions/v58.0.0/sdk/map-view/). Admin credential tetap server-only; app config Firebase client bukan private key Admin.

## Gate sebelum programmer mulai dan sebelum rilis

Sebelum mulai: SRS dibaca, ownership dipahami, branch dari baseline sama, config kosong dikenali, fixture sintetis disepakati. Ketidaktersediaan koordinat/perangkat tidak menghalangi pengerjaan UI dan tes logika, tetapi menghalangi klaim demo selesai.

Sebelum integrasi: kontrak backend Agiel/Daniel sama; query proyeksi Daniel/Yudha sama; platform diputuskan; URL server, native config, koordinat dan policy tersedia. Sebelum demo: semua [tes wajib](testing.md), migrasi aman dan lint/typecheck lulus. PM meninjau diff terbaru setelah sinkronisasi `main`, bukan langsung merge berdasarkan tes branch lama.
