# Hasil verifikasi fondasi PM

18 November 2026 · Windows · Node 24.22.3 · baseline `origin/main` = `55da6de`.

## Hasil aktual

| Pemeriksaan | Hasil |
| --- | --- |
| `npm run lint` | Lulus setelah perubahan dependensi/config |
| `npm run typecheck` | Lulus |
| `node --test tests/attendance-view.test.cjs tests/leave-request.test.cjs tests/sprint3-config.test.cjs` | 11 tes lulus, 0 gagal (4 regresi view/izin dan 7 konfigurasi fondasi) |
| `npx expo install --check` | Lulus: dependencies up to date, tetap Expo SDK 58 |
| `npx expo config --type introspect --json` | Lulus; plugin dapat dievaluasi; tidak menambah permission audio/background location Android; tidak membuat folder native |
| `npx expo export --platform web --output-dir ../labsync-s3-web-build` | Lulus; bundle web/server dan dua API route existing berhasil dibuat |
| `npm run sprint3:check` | Struktur valid; secara eksplisit melaporkan belum siap demo |
| `npm run sprint3:check -- --strict` | Exit 1 sesuai harapan: empat koordinat lab, platform dan API origin belum terisi |
| Tautan lokal Markdown dan `git diff --check` | Valid; tidak ada whitespace error |
| Sinkronisasi baseline | `origin/main` diperiksa ulang; tetap `55da6de`, tidak ada konflik basis |

Source layar, tema, context, endpoint existing dan `firestore.rules` tidak diubah. Dependency/config native diperbarui; ini tidak menjadi bukti tampilan maupun perilaku native identik pada perangkat. Tidak ada build cloud, push, PR, deploy, seed cloud atau perubahan akun/data Firebase dalam persiapan ini.

## Audit dependensi yang masih perlu ditindaklanjuti

`npm audit` belum bersih. Baseline melaporkan 47 entri paket terdampak (36 high, 11 moderate); hasil akhir juga 47 entri (41 high, 6 moderate). Entri paket mencakup propagasi dependency, bukan jumlah advisory unik. Perbandingan ID sumber advisory pada dua laporan turun dari 28 menjadi 5, tanpa ID advisory baru pada hasil akhir. Perubahan jumlah label severity paket tidak boleh disimpulkan sebagai bukti tidak ada risiko.

Lima advisory tersisa menurut laporan npm terkait `@grpc/grpc-js` (dua), `minimatch`, `picomatch`, dan `zod`. PM perlu menugaskan peninjauan patch/rantai dependency sebelum rilis; tentukan versi yang aman dan kompatibel, lalu jalankan regresi server/rules/build. Jangan menganggap semua entry dapat dieksploitasi oleh alur aplikasi tanpa analisis penggunaan. `npm audit fix --force` tidak dijalankan karena saran otomatis mencakup perubahan besar/downgrade SDK dan belum diverifikasi kompatibilitasnya. Detail JSON audit disertakan pada paket review PM.

## Belum diverifikasi dan bukan klaim selesai Sprint 3

- QR/geotag/Maps/FCM belum diimplementasikan oleh branch fondasi; matriks fitur pada [testing.md](testing.md) adalah pekerjaan penerimaan berikutnya.
- Koordinat resmi belum diberikan; seluruh lab tetap nonaktif. Perangkat/platform demo belum ditetapkan.
- Belum ada pengujian kamera, GPS dan remote FCM pada perangkat, build Android/iOS, atau bukti tiga alur demo.
- Tidak menjalankan tes browser end-to-end maupun rules emulator pada perubahan ini; source UI/rules existing tidak berubah. Build web membuktikan bundling, bukan alur login/presensi lengkap.
- Metadata instance cloud gagal dibaca karena CLI Firebase belum login. Edition, cloud rules, IAM, billing dan native credential belum diverifikasi.
- Workflow GitHub baru berupa berkas lokal; belum ada run GitHub Actions.

Lanjutkan [setup.md](setup.md) dan pengujian fitur sesuai SRS owner. Fondasi dapat direview sebagai persiapan kerja, bukan rilis aplikasi Sprint 3.
