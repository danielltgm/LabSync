# Zufar: Z1-Z4 Handoff

Programmer: Muhammad Hafidh Zufar Dewantara.

Branch: `feat/zufar-recap-history`.

## Scope dan dependensi

- Z1: `src/components/common/EmptyState.tsx`, ikon bawaan atau ikon dari props, judul, dan instruksi.
- Z2: `src/components/rekap/AttendanceListItem.tsx` dan `AttendanceSummaryCard.tsx`, identitas, NIM, jam presensi, catatan opsional, dan total hadir.
- Z3: `src/app/rekap/[id].tsx`, detail sesi, daftar terfilter, empty state, akses asisten sesi, sesi tidak ditemukan, dan navigasi kembali.
- Z4: `src/app/history.tsx`, riwayat berdasarkan NIM identitas aktif, tanggal sesi, jam presensi, status hadir, dan empty state.
- Semua komponen presentasi menerima props. Komponen layar ada di `src/components/rekap/`, bukan di direktori route.
- Integrasi sudah menghubungkan formulir Agil, beranda Yudha, rekap, dan riwayat ke state presensi bersama.

Dasar pekerjaan mandiri adalah Y4 `db53c89`, termasuk rangkaian PR Y1-Y4 (#4-#7). Kontrak presensi berasal dari PR Agil #1: commit asli `85017f8`, di-cherry-pick menjadi `496e752` dengan author Agil tetap dipertahankan. PR #8 sudah di-merge ke branch Y4, bukan ke `main`.

Sinkronisasi `origin/main` pada `d86124b` diselesaikan tanpa konflik melalui merge commit terpisah pada branch `feat/zufar-recap-history`. Ketiga komponen Agil dipertahankan dan dihubungkan ke alur bersama. Klaim lama bahwa beranda, context, dan reducer tidak disentuh hanya berlaku untuk pekerjaan mandiri Z1-Z4, bukan integrasi saat ini. PR integrasi ditujukan langsung ke `main`, terpisah dari PR #8 yang masuk ke Y4.

## Menjalankan Web Tanpa Hot Reload

Dari root repo:

```sh
npm ci
npx expo export --platform web
npx expo serve --port 8081
```

Buka `http://localhost:8081/`, bukan sandbox. Presensi awal kosong untuk semua identitas.

- Pilih Praktikan dan identitas aktif, lalu kirim formulir pada sesi `DIBUKA`; hasilnya terlihat di beranda dan `/history` melalui tombol Riwayat Saya.
- Pilih Asisten, lalu Lihat rekap untuk membuka `/rekap/[id]` dan melihat presensi yang sama. Buka/tutup sesi memakai kontrol Yudha.
- `/rekap/tidak-ada` menampilkan sesi tidak ditemukan. Direct link `/history` dengan peran awal Asisten menampilkan pembatasan peran.
- Navigasi dan pergantian peran mempertahankan state dalam memori; reload mengembalikan sesi/identitas awal dan mengosongkan presensi.

`app.json` bawaan memakai `web.output: "server"`. Gunakan server production hasil export, bukan static-file hosting murni atau Metro dev server. Perintah di atas tidak menjalankan hot reload atau emulator.

## Kontrak Props

| Komponen | Props utama | Perilaku |
| --- | --- | --- |
| `EmptyState` | `title`, `description`, `icon?` | Ikon dekoratif 48px; judul dan instruksi tetap terbaca. |
| `AttendanceListItem` | `attendance: AttendanceRecord` | Inisial maksimal dua kata, nama tidak dipotong, NIM, kelas, jam, fallback catatan kosong. |
| `AttendanceSummaryCard` | `total: number` | Caller memasok jumlah record sesi, bukan angka hardcoded. |
| `SessionRecap` | `sessionId?`, `sessions`, `attendances`, `activeUser?`, `onBack`, `notice?`, `sessionControls?` | Filter record berdasarkan sesi; data dan kontrol hanya terlihat bagi asisten pemilik sesi. |
| `AttendanceHistory` | `sessions`, `attendances`, `activeUser?`, `onBack`, `notice?` | Filter `studentId === activeUser.identifier`, bukan `activeUser.id`; urut tanggal/jam terbaru dahulu. |

Array data bersifat readonly pada props; komponen tidak memutasi dataset. Pergantian props langsung memperbarui list dan total. Tanggal riwayat berasal dari `Session.date`, sedangkan jam berasal dari `AttendanceRecord.checkInTime`. Tidak ada tanggal atau kehadiran yang dibuat-buat jika sesi terkait tidak ditemukan.

`AttendanceScreenHeader` dipakai bersama kedua layar. Tombol berlabel "Kembali" menjalankan callback route: kembali ke layar sebelumnya bila tersedia, atau ke `/` untuk direct link tanpa history navigasi.

## Integrasi Saat Ini

- `createLabSyncState` memulai `attendances: []`. `useLabSync` menyediakan array yang sama untuk submit formulir, status sudah presensi di beranda, rekap sesi, dan riwayat identitas aktif; route final tidak lagi memakai `PREVIEW_ATTENDANCES` atau notice data contoh.
- Reducer memvalidasi peran Praktikan, NIM dan nama sesuai identitas aktif setelah trim, sesi tersedia dan berstatus `DIBUKA`, serta kelas payload sesuai kelas sesi. Format waktu juga divalidasi. Duplikat pasangan sesi + NIM mengembalikan record lama tanpa menambah kehadiran.
- Context menghasilkan `checkInTime` melalui Intl (`toLocaleTimeString`) dengan locale `en-GB`, zona `Asia/Jakarta`, dan `hour12: false`, berupa `HH:mm:ss`. Bukan jam contoh hardcoded.
- Beranda menautkan langsung ke `/rekap/[id]` dan `/history`. Kontrol rekap tetap memakai `SessionControlAction` Yudha beserta konfirmasi dan validasi reducer; buka/tutup sesi tidak membuat presensi.
- Semua data hanya berlaku selama runtime lokal, reset saat reload, tanpa backend, persistensi, atau sinkronisasi antarperangkat.

- Form dan feedback memakai satu native modal dengan konten yang berganti, untuk menghindari perlombaan dismiss/present pada iOS. Form dipasang ulang pada setiap percobaan baru agar input dan error tidak tertinggal; form dan feedback bisa digulir pada layar pendek.
- Route `/preview/*`, `/zufar-sandbox`, komponen preview, dan `src/constants/preview-attendance.ts` sudah dihapus. Fixture statis hanya dipakai pada pengujian komponen terisolasi, bukan sebagai data aplikasi.

Commit dipisahkan antara sinkronisasi `main`, fitur integrasi beserta tes, dan dokumentasi. PR integrasi perlu review tim sebelum di-merge ke `main`. Folder `LabSync/` bertingkat yang sudah ada sebagai untracked tidak diubah dan tidak termasuk commit integrasi.

Kepemilikan sesi sementara menggunakan nama asisten sesuai kontrak `Session` yang dibekukan. Pembatasan peran ini untuk simulasi lokal Sprint 1, bukan autentikasi atau otorisasi backend.

## Verifikasi Integrasi

Hasil verifikasi ulang pada 25 Oktober 2026 setelah integrasi:

| Pemeriksaan | Hasil |
| --- | --- |
| `npx tsc --noEmit` | Lulus |
| `npx expo lint` | Lulus |
| `npx eslint src tests --max-warnings 0` | Lulus |
| `npm run test:state` | 56 tes lulus, termasuk subtes validasi |
| `npx expo export --platform web` | Lulus |
| `node --test tests/zufar-web.test.cjs` | 6 tes lulus, Edge headless berbasis Chromium, dengan konfigurasi tooling di bawah |
| `git diff --check` | Lulus |

Tes browser mulai dari beranda dengan presensi kosong, submit formulir nyata, lalu memeriksa jam yang sama pada feedback, riwayat, dan rekap di viewport 360px dan 1280px. Cakupan meliputi pergantian identitas/peran, isolasi data, batal/konfirmasi tutup sesi, riwayat sesi selesai, role guard, direct-link fallback, pembatalan formulir, retry identitas salah, reset saat reload, dan fixture props terisolasi. Feedback dengan catatan panjang juga diuji dapat digulir dan ditutup pada viewport 360x500. Tidak ada overflow horizontal atau error browser pada alur yang diuji.

Tes reducer memeriksa anti-duplikat berdasarkan sesi + NIM termasuk submit berurutan, identitas aktif, status sesi terbaru, integritas record lama, trim catatan, dan state awal kosong. Android/iOS, keyboard native, screen reader perangkat, dan text scaling native belum diuji langsung.

### Menjalankan Ulang Tes Browser

Playwright dan esbuild hanya tooling eksternal; tidak ditambahkan ke dependency aplikasi agar file fondasi tim tidak berubah. Install ke direktori tooling sementara yang tersedia, lalu arahkan `NODE_PATH` ke `node_modules` direktori tersebut. Versi yang digunakan: Playwright `1.64.1`, esbuild `0.28.2`.

Contoh PowerShell pada mesin pengujian ini:

```powershell
npm install --prefix "$env:TEMP\opencode" playwright@1.64.1 esbuild@0.28.2
$env:NODE_PATH = "$env:TEMP\opencode\node_modules"
$env:PLAYWRIGHT_CHANNEL = 'msedge'
npx expo export --platform web
node --test tests/zufar-web.test.cjs
```

Jika Edge tidak tersedia, install browser Chromium menggunakan CLI Playwright dari direktori tooling dan kosongkan `PLAYWRIGHT_CHANNEL`. Tes menggunakan port `18765` dan mengelola sendiri proses `expo serve`. Opsional: set `LABSYNC_SCREENSHOT_DIR` ke direktori yang sudah ada untuk menyimpan screenshot. Tidak ada server dev/hot reload yang dijalankan.

### Dependency Audit

Audit historis `npm audit --omit=dev` melaporkan 8 kerentanan bawaan (3 moderate, 5 high), melalui `node-forge`, `uuid`, dan `zod` di dependency transitif tooling Expo. Tidak dilakukan `npm audit fix --force`: rekomendasinya mencakup perubahan Expo yang breaking dan di luar scope Z1-Z4. Audit belum diulang untuk integrasi ini; perlu tindak lanjut pemelihara sebelum deployment production.
