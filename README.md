# 🧪 LabSync

Satu app buat praktikum, dari cek jadwal sampai rekap presensi. Asisten buka sesi, praktikan lihat statusnya langsung. Sekarang LabSync lagi masuk Sprint 2, pakai akun Firebase dan data yang bisa diakses bareng.

**Stack** · Expo Router · React Native · TypeScript · Firebase Auth · Cloud Firestore

## 🚀 Jalanin app

Pakai Node.js 24 LTS (minimal 24.3), lalu run `npm ci` dari root repo.

### Firebase dev bareng tim

1. Ambil file `.env.local` dan akun demo dari PM. Taruh file-nya di folder yang sama dengan `package.json`.
2. Cek project ID-nya `labsync-sprint2-dev` dan `EXPO_PUBLIC_FIREBASE_EMULATORS=false`.
3. Run `npm run web` buat browser, atau `npm start` lalu scan QR dari Expo Go. Kalau HP beda jaringan sama Metro, pakai `npx expo start --tunnel`.

File `.env.local` berisi config client yang bisa dibagi ke tim. Password akun demo dikirim terpisah lewat channel privat. Simpan credential Admin dan secret API pengajar di luar Git dan `EXPO_PUBLIC_*`. Kalau perlu akses project, minta invite ke PM. [Firebase Console](https://console.firebase.google.com/project/labsync-sprint2-dev/overview)

### Emulator lokal

Pakai ini kalau mau ngulik rules atau reset data demo sendiri. Firestore Emulator butuh Java 21+.

1. Copy [`.env.example`](.env.example) ke `.env.local`. Biarkan `EXPO_PUBLIC_FIREBASE_EMULATORS=true`.
2. Di terminal pertama, run `npm run firebase:emulators` dan biarkan jalan.
3. Di terminal kedua, run `npm run firebase:seed`, lalu `npm run web`.

| Role | Email emulator | Password emulator |
| --- | --- | --- |
| Asisten | `assistant@labsync.example` | `labsync-local` |
| Praktikan | `student@labsync.example` | `labsync-local` |

**Coba bareng dua akun.** Buka **Pemrograman Mobile** sebagai asisten di satu profil browser, lalu lihat statusnya berubah di profil praktikan tanpa refresh. Tutup sesi dan reload halaman praktikan buat cek statusnya tetap tersimpan. Buat ngulang dari awal, restart emulator tanpa import data, lalu seed ulang. Seed di emulator yang masih jalan mempertahankan status sesi.

<details>
<summary>Pakai emulator dari HP</summary>

Sambungkan HP dan komputer ke Wi-Fi yang sama. Set `host` Auth dan Firestore di `firebase.json` ke IP LAN komputer. Pakai IP itu juga buat `EXPO_PUBLIC_FIREBASE_EMULATOR_HOST`, lalu restart emulator dan Expo. Saat seed, isi `FIREBASE_AUTH_EMULATOR_HOST` dengan `IP_LAN:9099` dan `FIRESTORE_EMULATOR_HOST` dengan `IP_LAN:8080`.

</details>

## 👥 User stories

Ini target Sprint 2. Di scaffold sekarang, lo sudah bisa login/logout, lihat jadwal sesuai akun, buka/tutup sesi secara live, dan baca data rekap atau history dari Firestore.

- **Sebagai praktikan**, gue mau lihat jadwal kelas sendiri dan absen sekali saat sesi dibuka, biar kehadiran gue kecatat dan bisa dicek lagi di riwayat.
- **Sebagai asisten**, gue mau ngatur kelas, peserta, dan jadwal, lalu buka sesi dan lihat siapa yang sudah hadir tanpa refresh.
- **Sebagai praktikan yang berhalangan**, gue mau kirim alasan izin dan bisa cek statusnya dari akun gue.
- **Sebagai asisten yang review izin**, gue mau lihat alasan dan kategori dari AI sebelum gue sendiri putuskan izinnya diterima atau ditolak.

## 🗂️ Dari Sprint 1 ke Sprint 2

| Sprint | Yang dikerjain |
| --- | --- |
| **Sprint 1 · UI & alur lokal** | FR‑01–04 mencakup jadwal, simulasi role, dan kontrol sesi. FR‑05–07 mencakup form presensi, cek duplikat, dan feedback. FR‑08–10 mencakup rekap, riwayat, dan empty state. Semuanya jalan pakai state lokal. |
| **Sprint 2 · Akun & data bareng** | Firebase Auth pegang identitas, Firestore simpan data dan kirim update real-time. Scope-nya nambah pengelolaan data kelas, presensi per akun, serta pengajuan dan review izin. |

Di Sprint 1, **Yudha** pegang beranda, navigasi, dan kontrol sesi. **Agil** pegang kartu praktikan, form, dan feedback presensi. **Zufar** pegang empty state, rekap, dan history. Layar dan komponen yang masih kepakai jadi dasar Sprint 2. [SRS Sprint 1](docs/srs.md) · [Pembagian Sprint 1](docs/programmer.md)

### Siapa pegang apa di Sprint 2?

| SRS | Owner | Scope |
| --- | --- | --- |
| SRS-01 | Daniel | Registrasi, login, role, dan akses akun |
| SRS-02 | Daniel | Firestore dan CRUD kelas, peserta, jadwal, serta sesi |
| SRS-03 | Agiel | Presensi per akun dan pencegahan presensi ganda |
| SRS-04 | Agiel | Pengajuan izin dan integrasi AI buat klasifikasi alasan |
| SRS-05 | Zufar | Rekap dan riwayat presensi real-time |
| SRS-06 | Zufar | Review izin dan keputusan asisten |
| SRS-07 | Bareng tim · Yudha (PM) | Integrasi, testing, dan demo dua akun |

Endpoint, cara autentikasi, dan format respons API pengajar masih ditunggu. Kontrak internal klasifikasi sudah ada buat mulai ngerjain flow izin. [Kontrak API dan skema Firestore](docs/sprint-2-contract.md)

## 🛠️ Checks

```sh
npm run lint
npx tsc --noEmit
npm run test:rules
```

`test:rules` nyalain emulator sendiri. Stop Firestore yang lagi pakai port `8080` sebelum jalanin command itu.

Buat browser smoke test, mulai dari emulator yang baru di-seed dan Expo web yang lagi jalan. Set `LABSYNC_WEB_URL` kalau Expo pakai port selain `8081`.

```sh
npx playwright install chromium
npm run test:web
```

<details>
<summary>Seed Firebase dev buat PM</summary>

Pakai Application Default Credentials, lalu run `node scripts/seed-firebase.cjs labsync-sprint2-dev`. Simpan password akun baru secara privat. Seed ulang mempertahankan password dan status sesi yang sudah ada.

</details>
