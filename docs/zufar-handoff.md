# Zufar: Z1-Z4 Handoff

> historical standalone-stage notes. see [integration-handoff.md](integration-handoff.md) for the connected team flow.

Programmer: Muhammad Hafidh Zufar Dewantara.

Branch: `feat/zufar-recap-history`.

## Scope dan dependensi

- Z1: `src/components/common/EmptyState.tsx`, ikon bawaan atau ikon dari props, judul, dan instruksi.
- Z2: `src/components/rekap/AttendanceListItem.tsx` dan `AttendanceSummaryCard.tsx`, identitas, NIM, jam presensi, catatan opsional, dan total hadir.
- Z3: `src/app/rekap/[id].tsx`, detail sesi, daftar terfilter, empty state, akses asisten sesi, sesi tidak ditemukan, dan navigasi kembali.
- Z4: `src/app/history.tsx`, riwayat berdasarkan NIM identitas aktif, tanggal sesi, jam presensi, status hadir, dan empty state.
- Semua komponen presentasi menerima props. Komponen layar ada di `src/components/rekap/`, bukan di direktori route.
- Implementasi mandiri sesuai pilihan scope. Belum menghubungkan formulir presensi Agil atau mengubah tautan beranda Yudha.

Dasar branch adalah Y4 `db53c89`, termasuk rangkaian PR Y1-Y4 (#4-#7). Kontrak presensi berasal dari PR Agil #1: commit asli `85017f8`, di-cherry-pick menjadi `496e752` dengan author Agil tetap dipertahankan. Tidak ada PR tim yang di-merge di GitHub.

Tidak ada perubahan pada file milik tim: `_layout.tsx`, `index.tsx`, context, reducer, shared tokens, seed data, role switcher, kontrol sesi, atau komponen Agil. Tidak ada perubahan dependency aplikasi atau lockfile oleh pekerjaan Zufar.

## Menjalankan Web Tanpa Hot Reload

Dari root repo:

```sh
npm ci
npx expo export --platform web
npx expo serve --port 8081
```

Buka `http://localhost:8081/zufar-sandbox` untuk memilih peran, identitas, dan tautan layar Zufar. Sandbox tidak mengganti beranda tim.

- `/rekap/ses-002`: contoh satu kehadiran Agil, jam `10:35:14`, catatan `PC-09`.
- `/rekap/ses-001` dan `/rekap/ses-003`: contoh rekap kosong.
- `/rekap/tidak-ada`: sesi tidak ditemukan.
- `/history`: pilih peran Praktikan di sandbox terlebih dahulu. Agil memiliki satu contoh kehadiran; Zufar tidak memiliki riwayat.
- Navigasi menggunakan tautan di sandbox mempertahankan identitas/perubahan sesi dalam memori. Reload mereset state sesuai fondasi Yudha.

`app.json` bawaan memakai `web.output: "server"`. Karena itu preview menggunakan server production hasil export, bukan static-file hosting murni dan bukan Metro dev server. Tidak ada hot reload atau emulator. Server pengujian otomatis ditutup setelah tes.

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

## Batas Demo dan Integrasi Akhir

Route Zufar membaca identitas dan sesi dari provider Yudha yang sudah tersedia. Presensi tetap menggunakan `PREVIEW_ATTENDANCES` read-only, dengan pemberitahuan demo terlihat di kedua layar. Buka/tutup sesi tidak membuat kehadiran baru. Kontrol sesi pada rekap memakai `SessionControlAction` Yudha, termasuk modal konfirmasi dan reducer yang sudah memvalidasi aksi.

Langkah integrasi yang masih menjadi pekerjaan tim:

1. Yudha dan Agil menyediakan attendance state/action bersama, termasuk validasi status sesi dan anti-duplikat.
2. Pada kedua route Zufar, ganti `PREVIEW_ATTENDANCES` dengan array attendance dari context. Pertahankan komponen presentasi dan kontraknya.
3. Yudha mengganti tautan `/preview/rekap/[id]` dan `/preview/history` di beranda menjadi `/rekap/[id]` dan `/history`.
4. Hapus notice demo, sandbox, serta preview routes/data ketika integrasi benar-benar selesai. Jangan menghapus data contoh sebelum seluruh consumer preview diperbarui.
5. Uji alur SRS lima tahap termasuk submit presensi nyata dalam memori dan penolakan duplikat. Pengujian mandiri ini tidak menyatakan alur tim tersebut sudah selesai.

Kepemilikan sesi sementara menggunakan nama asisten sesuai kontrak `Session` yang dibekukan. Pembatasan peran ini untuk simulasi lokal Sprint 1, bukan autentikasi atau otorisasi backend.

## Verifikasi

Hasil pada 25 Oktober 2026:

| Pemeriksaan | Hasil |
| --- | --- |
| `npx tsc --noEmit` | Lulus |
| `npx expo lint` | Lulus |
| `npx eslint . --max-warnings 0` | Lulus, termasuk skrip pengujian |
| `npm run test:state` | 5 tes lulus, regresi fondasi Yudha |
| `npx expo export --platform web` | Lulus |
| `node --test tests/zufar-web.test.cjs` | 4 tes lulus, Edge headless berbasis Chromium |

Tes browser memeriksa viewport 360px dan 1280px, data terisi/kosong, isolasi sesi dan identitas, batal/konfirmasi tutup sesi, riwayat sesi selesai, role guard, direct-link fallback, target tombol kembali minimal 44px, serta tidak adanya overflow horizontal dan error console pada alur production. Fixture props terisolasi memakai komponen asli dengan React Native Web, bukan route tambahan dalam aplikasi: nama panjang, catatan kosong, perubahan data, pengguna/sesi hilang, urutan riwayat, dan ikon kustom.

Screenshot rekap dan riwayat pada kedua ukuran juga diperiksa. Android/iOS, screen reader perangkat, dan text scaling native belum diuji.

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

`npm audit --omit=dev` melaporkan 8 kerentanan bawaan (3 moderate, 5 high), melalui `node-forge`, `uuid`, dan `zod` di dependency transitif tooling Expo. Tidak dilakukan `npm audit fix --force`: rekomendasinya mencakup perubahan Expo yang breaking dan di luar scope Z1-Z4. Perlu tindak lanjut pemelihara fondasi/dependency sebelum deployment production.
