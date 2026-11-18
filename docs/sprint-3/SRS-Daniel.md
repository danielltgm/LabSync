# SRS S3-D — Daniel

**Modul:** konfigurasi laboratorium, sesi, QR dan backend presensi. **PM:** Muhammad Hafidh Zufar Dewantara. Status: siap dikerjakan setelah kontrak fondasi disepakati; fitur belum diimplementasikan.

## Tujuan dan pengguna

Asisten memilih satu dari empat lab dan radius sesi yang dikelolanya, membuka sesi, lalu menampilkan QR. Praktikan terdaftar dapat mencatat presensi hanya melalui pemeriksaan server. Asisten kelas lain tidak dapat mengelola sesi tersebut.

## Kebutuhan fungsional dan kriteria terima

| ID | Sistem harus | Kriteria terima |
| --- | --- | --- |
| D-01 | Menyimpan master `labs/{labId}` untuk `lab-ap`, `lab-b`, `lab-c`, `lab-d` | Nama tepat LAB AP/B/C/D; koordinat angka dalam rentang geografis; lab belum dikonfigurasi tetap nonaktif; akun terautentikasi dapat membaca info lab |
| D-02 | Memungkinkan asisten pemilik memilih lab aktif dan radius positif pada sesi `TERJADWAL` | Simpan `labId`, `radiusMeters`, versi lokasi; tolak ID asing, null, radius nol/negatif/tidak finit; pengguna lain dan praktikan ditolak; pembukaan tanpa konfigurasi gagal dengan pesan |
| D-03 | Menerbitkan dan merotasi QR melalui server bagi asisten pemilik saat sesi `DIBUKA` | QR berisi versi, sessionId, challengeId dan token acak tidak dapat ditebak; simpan hash token, masa berlaku dan ikatan sesi; QR lama/kedaluwarsa/sesi lain ditolak; TTL awal 60 detik dari policy, dievaluasi PM saat demo lapangan |
| D-04 | Memverifikasi ID token Firebase, profil dan enrollment pada setiap presensi | UID/NIM/nama/kelas diambil dari server; input yang memalsukan identitas tidak mengubah pemilik presensi; akun tanpa login dan nonpeserta ditolak |
| D-05 | Memvalidasi sesi, QR, lokasi dan radius dalam proses penulisan otoritatif | Baca sesi `DIBUKA`, challenge dan konfigurasi sesi konsisten dalam transaksi; validasi lokasi finit, rentang, akurasi dan usia pengukuran sesuai kebijakan; hitung jarak server; hanya `distanceMeters <= radiusMeters` diterima |
| D-06 | Menulis satu presensi per sesi dan UID secara atomik/idempoten | ID `${sessionId}__${uid}` dipertahankan; dua permintaan bersamaan menghasilkan satu dokumen; retry mengembalikan rekaman milik sendiri; timestamp dari server, audit QR/geotag tersimpan tanpa token mentah |
| D-07 | Menyediakan proyeksi jadwal/sesi untuk aktivitas lab | Publikasikan hanya courseName, className, labId, rentang waktu dan status; perubahan jadwal/status/hapus tercermin; tidak membuka koleksi sesi privat secara global demi Maps |
| D-08 | Menutup bypass presensi Sprint 2 dan melindungi field baru | Direct client create/update/delete attendance ditolak pada versi Sprint 3; lab master, challenge dan proyeksi hanya ditulis trusted server/operator; aturan/endpoint asisten memeriksa ownership |
| D-09 | Menangani sesi lama tanpa mengarang geotag | Sesi lama tetap dapat dibaca rekap/riwayat; sebelum presensi baru, asisten wajib memilih lab/radius dan memvalidasi konfigurasi; tidak menghapus presensi atau izin lama |

## Alur utama

1. PM melengkapi dan memverifikasi koordinat empat lab; Daniel menyiapkan prosedur impor yang aman dan tidak menimpa data tanpa pemeriksaan.
2. Asisten memilih lab dan radius saat menyiapkan sesi. Ketika membuka sesi, server membuat snapshot lokasi/radius dan kebijakan validasi. Snapshot tidak dapat diedit saat sesi dibuka.
3. Asisten meminta QR dari server; layar QR diperbarui sebelum kedaluwarsa. Menutup sesi membatalkan challenge aktif.
4. Agiel mengirim QR hasil scan dan pengukuran lokasi. Server memeriksa semua syarat, lalu menulis data presensi kompatibel Sprint 2 ditambah audit Sprint 3.
5. Watcher rekap yang ada menerima data baru. Bila jawaban jaringan hilang setelah commit, pengiriman ulang menghasilkan `already-recorded`, bukan presensi baru.

## Kontrak dan dependensi

Ikuti [contract.md](contract.md) dan `src/types/sprint3.ts`. Endpoint rencana: `POST /api/attendance/challenges`, `POST /api/attendance/check-in`. Gunakan modul `src/server/attendance/` yang tidak diimpor client. Expo API routes sudah ada di Sprint 2; PM harus menetapkan URL HTTPS server yang benar untuk native, bukan alamat Metro lokal pada build rilis.

Daniel memberikan contoh respons sukses/error kepada Agiel sebelum implementasi layar selesai. Field sesi, revision jadwal, proyeksi aktivitas, dan alasan perubahan diberikan kepada Yudha sebelum trigger notifikasi ditulis. Jangan memasukkan SDK Admin atau service account ke bundle aplikasi.

## Pengujian yang wajib disertakan

- Tes endpoint dengan login berbeda: peserta, nonpeserta, asisten pemilik, asisten lain, token kedaluwarsa.
- QR salah format, dipalsukan, expired, challenge dicabut, lintas sesi; sesi ditutup saat scan/commit.
- Di dalam, tepat batas, di luar radius; koordinat null/NaN/infinity/out-of-range; pengukuran lama, terlalu jauh di masa depan, akurasi buruk; konfigurasi belum ada.
- Dua permintaan simultan dan retry setelah commit; identitas dari body tidak dipercaya.
- Tes rules memastikan direct-write attendance dan akses privat challenge/token tidak dapat dilakukan client. Query rekap/riwayat sah tetap berhasil.
- Proyeksi dibuat, diubah dan dihapus sesuai sesi; tidak memuat UID, alasan izin atau daftar peserta.

## Definition of Done

Semua D-01–09 teruji; lint/typecheck lulus; tes server/rules lulus; kontrak dan indeks diperbarui; data lama dapat dibaca; demonstrasi QR + lokasi asli masuk rekap asisten. Cantumkan batasan: GPS yang dilaporkan perangkat bukan bukti anti-pemalsuan mutlak. Tes fungsi jarak saja belum membuktikan server aman.
