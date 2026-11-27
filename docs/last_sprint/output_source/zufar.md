# Jobdesk Sprint 4 — Zufar (`SRS-4.2`, `SRS-4.3`, `SRS-4.7`)

> **Dokumen Hub:** [`srs.md`](./srs.md)  
> **Single Source of Truth:** [`kebutuhan_sprint_4.md`](../resource/kebutuhan_sprint_4.md) (Poin 2, 3, 7) & [`notes.md`](../resource/notes.md)  
> **Prasyarat Branching:** Mulai branching dari `main` **hanya setelah** `Commit 0` (`chore/s4-shared-foundation`) di-merge. Setelah itu pekerjaan Zufar **100% paralel** tanpa menunggu Daniel atau Yudha.

---

## 1. User Stories (Format Form)

```text
Zufar - SRS-4.2 : Sebagai Aslab, saya dapat memantau dashboard keberlangsungan laboratorium berbasis Firebase yang menampilkan jumlah lab dan praktikan, status dan jadwal kegiatan, riwayat kegiatan lab, serta riwayat keuangan denda dengan filter hari, minggu, dan bulan.
Zufar - SRS-4.3 : Sebagai Asprak, saya hanya dapat mengelola sesi praktikum kelas tanggung jawab saya (melihat jadwal, membuka/menutup sesi secara real-time, memantau presensi, dan mengelola izin) tanpa kewenangan konfigurasi lab maupun distribusi praktikan.
Zufar - SRS-4.7 : Sebagai Praktikan dan Asprak, saya dapat mengajukan dan meninjau izin dengan dukungan analisis sentimen model lokal TF-IDF (positif, negatif, netral) yang tersimpan di Cloud Firestore, tetap berjalan aman saat layanan AI terganggu, dan terintegrasi dengan status excused absence serta pembebasan denda.
```

---

## 2. Lingkup Fitur & Ketentuan Wajib

### A. Dashboard Keberlangsungan Laboratorium oleh Aslab (`SRS-4.2`)
- Bangun layar dashboard khusus **`ASLAB`** (`/dashboard-lab` serta integrasi ringkasan utama di `AslabHome` pada `src/app/(app)/(tabs)/index.tsx`) yang memanfaatkan data real-time dari **Cloud Firestore** (`labs`, `classes`, `sessions`, `users`, `fines`, `payments`).
- Sediakan **filter periode interaktif**: **Hari**, **Minggu**, dan **Bulan** yang memfilter jadwal, riwayat kegiatan, dan ringkasan keuangan secara konsisten.
- **Informasi Wajib yang Ditampilkan:**
  1. **Ringkasan Statistik:** Jumlah laboratorium & jumlah praktikan terdaftar.
  2. **Status Kegiatan per Laboratorium:** Status tiap lab saat ini (`Sedang berlangsung` / `Terjadwal` / `Kosong`) lengkap dengan informasi lokasi (gedung, lantai) dan waktu pelaksanaan.
  3. **Jadwal Praktikum:** Daftar sesi yang sedang berlangsung (`DIBUKA`) dan yang akan datang (`TERJADWAL`) pada periode terpilih.
  4. **Riwayat Kegiatan Laboratorium:** Daftar sesi yang telah selesai (`SELESAI`) beserta ringkasan kehadiran.
  5. **Riwayat Keuangan Denda Praktikum:** Ringkasan total denda terbayar (`paid` / `success`), tertunda (`pending`), belum dibayar (`unpaid`), serta daftar transaksi denda pada periode terpilih *(langsung memanfaatkan kontrak `state.fines` & `state.payments` dari Commit 0)*.

### B. Pengelolaan Sesi & Pembatasan Ketat Kewenangan Asprak (`SRS-4.3`)
- **Fitur yang Dipertahankan & Disempurnakan untuk `ASPRAK`:**
  - Melihat daftar kelas, jadwal, dan sesi praktikum yang **hanya menjadi tanggung jawabnya** (`cls.assistantNims.includes(me.nim)`).
  - Membuka sesi saat kegiatan praktikum dimulai dan menutup sesi saat praktikum berakhir, tersinkronisasi **real-time** dengan aplikasi praktikan.
  - Memantau & mengelola presensi praktikan pada sesi tanggung jawabnya (`/sesi/[id]`, `/rekap/[id]`, `/(tabs)/presensi`).
  - Meninjau pengajuan izin praktikan kelas tanggung jawabnya (`/(tabs)/izin`, `/izin/[id]`).
- **Pembatasan Ketat (Audit & Pembersihan UI `ASPRAK`):**
  - Sesuai `notes.md`, **hapus/sembunyikan** seluruh kontrol manajemen non-operasional untuk role `ASPRAK` (pindahkan/pastikan hanya tampil untuk `ASLAB`):
    - Tidak ada tombol tambah/keluarkan praktikan (`enroll` / `unenroll`), tambah/lepas asprak, atau ubah konfigurasi kelas/tautan di `/kelas/[id]`.
    - Tidak ada tombol buat pertemuan/jadwal baru atau ubah konfigurasi lab dari beranda/kelas `ASPRAK`.
    - Fokuskan `AsprakHome` (`(tabs)/index.tsx`) pada: sesi aktif/berikutnya (buka/tutup cepat), daftar izin menunggu review, dan jadwal hari ini.

### C. Analisis Sentimen Model Lokal EDOM (TF-IDF) & Pengelolaan Izin (`SRS-4.7`)
- **Integrasi Model Sentimen Lokal Pengajar (`Doctor3131/ppk-rn-expo-58/tree/main/ai`):**
  - Salin langsung 2 file resmi dari repositori pengajar (tanpa melatih/membuat korpus TF-IDF sendiri):
    - `sentiment.js` → `src/lib/ai/sentiment.js` *(pure JS inference, zero dependency, ekspor `createSentimentClassifier`)*
    - `model-edom.json` → `src/lib/ai/model-edom.json` *(model LinearSVC TF-IDF pre-trained ~273 KiB, 3.000 vocab, label `['negatif', 'netral', 'positif']`)*
  - Implementasikan wrapper di `src/server/sentiment-tfidf.ts` yang memanggil `createSentimentClassifier(model)(reason)` dan memetakan hasilnya ke kontrak `LeaveSentiment`:
    - `status === 'predicted'` → `{ label: res.label, score: Math.max(...res.scores), status: 'predicted', model: 'edom-tfidf', analyzedAt: Date.now() }`.
    - `label === null` (`'unknown_vocabulary'` / `'empty_input'`) → `{ label: null, status: res.status, model: 'edom-tfidf', analyzedAt: Date.now() }`.
    - **Aturan Wajib `ai/README.md`:** **Jangan pernah menganggap `label: null` sebagai `'netral'`!**
  - **Graceful Error Handling:** Bungkus eksekusi dalam `try/catch`; jika terjadi kegagalan/error, kembalikan `{ label: null, status: 'unavailable', model: 'edom-tfidf', analyzedAt: Date.now() }` sehingga pengajuan dan peninjauan izin **tetap berjalan lancar tanpa terhambat**.
  - Hasil analisis otomatis tersimpan di Cloud Firestore bersama dokumen pengajuan izin (`leaves/{id}.sentiment`) melalui hook `submitLeave` dari Commit 0 (berdampingan dengan `category` dari Sprint 2).
- **Penyempurnaan UI Pengajuan & Peninjauan Izin:**
  - Komponen `AiSentimentPill` di `src/components/app/status.tsx` untuk menampilkan 5 kondisi: `Positif`, `Negatif`, `Netral`, `Belum dapat dianalisis` (`unknown_vocabulary` / `empty_input`), dan `Analisis AI tidak tersedia` (`unavailable`).
  - Tampilkan hasil analisis sentimen AI di daftar izin (`(tabs)/izin.tsx`) dan detail izin (`/izin/[id].tsx`) lengkap dengan keterangan eksplisit bahwa **hasil AI hanya informasi pendukung bagi Asprak, bukan keputusan otomatis**.
  - Praktikan dapat memantau status izin (`pending` / `approved` / `rejected`) secara *real-time*.
  - Pastikan tampilan detail izin & konfirmasi persetujuan menjelaskan dengan jelas bahwa izin yang disetujui dicatat sebagai **tidak hadir dengan izin (`IZIN` / *excused absence*)** dan **dibebaskan dari denda keterlambatan** (tidak berubah menjadi `HADIR`).
- **Finalisasi Konsistensi UI Lintas Peran:** Merapikan label peran (`Aslab`, `Asprak`, `Praktikan`) dan konsistensi visual pada layar beranda, kelas, sesi, dan izin.

---

## 3. Rencana Branching (`feat/`, `fix/`, `chore/`)

| Urutan | Nama Branch | Fokus Deliverable |
| :---: | :--- | :--- |
| 1 | `feat/s4-aslab-dashboard` | `src/data/selectors-dashboard.ts`, komponen `src/components/dashboard/**`, layar `/dashboard-lab`, dan integrasi `AslabHome` di `(tabs)/index.tsx` dengan filter hari/minggu/bulan + riwayat keuangan denda. |
| 2 | `fix/s4-asprak-role-scope` | Pembatasan & pembersihan UI `ASPRAK` pada `(tabs)/index.tsx`, `(tabs)/kelas.tsx`, `/kelas/[id]`, `/sesi/[id]`, `/rekap/[id]`, dan `(tabs)/presensi.tsx` agar hanya tersisa buka/tutup sesi, pantau presensi, dan kelola izin. |
| 3 | `feat/s4-tfidf-sentiment-leave` | Model lokal TF-IDF `src/server/sentiment-tfidf.ts`, `AiSentimentPill` di `src/components/app/status.tsx`, dan pembaruan alur izin di `(tabs)/izin.tsx`, `/izin/baru`, serta `/izin/[id]`. |

---

## 4. Physical File Ownership (Exclusive — Nol Konflik)

Zufar memiliki kepemilikan penuh atas file-file berikut dan **tidak boleh** mengedit file milik Daniel atau Yudha:

- **AI & Dashboard Selectors:**
  - `src/lib/ai/sentiment.js` *(salinan langsung dari `Doctor3131/ppk-rn-expo-58/main/ai/sentiment.js`)*
  - `src/lib/ai/model-edom.json` *(salinan langsung dari `Doctor3131/ppk-rn-expo-58/main/ai/model-edom.json`)*
  - `src/server/sentiment-tfidf.ts` *(wrapper `createSentimentClassifier(model)` → `LeaveSentiment` + fallback aman)*
  - `src/data/selectors-dashboard.ts` *(agregasi filter Hari/Minggu/Bulan untuk status lab, jadwal, riwayat kegiatan, dan riwayat keuangan denda)*
- **Komponen UI:**
  - `src/components/dashboard/period-filter.tsx` *(segmented filter Hari / Minggu / Bulan)*
  - `src/components/dashboard/lab-status-list.tsx` *(status per lab, lokasi, waktu pelaksanaan)*
  - `src/components/dashboard/finance-summary-card.tsx` *(ringkasan & riwayat keuangan denda praktikum)*
  - `src/components/app/status.tsx` *(tambahkan `AiSentimentPill` untuk label `positif` / `negatif` / `netral` / `unavailable`)*
- **Layar Expo Router:**
  - `src/app/(app)/dashboard-lab.tsx` *(Dashboard Keberlangsungan Laboratorium lengkap untuk Aslab)*
  - `src/app/(app)/(tabs)/index.tsx` *(Beranda lintas peran: `AslabHome` terhubung ke dashboard, `AsprakHome` fokus sesi & izin, `StudentHome` rapih)*
  - `src/app/(app)/(tabs)/izin.tsx` *(daftar izin + badge sentimen AI)*
  - `src/app/(app)/izin/baru.tsx` *(pengajuan izin praktikan)*
  - `src/app/(app)/izin/[id].tsx` *(detail & review izin oleh Asprak + badge sentimen AI + catatan excused absence & bebas denda)*
  - `src/app/(app)/(tabs)/kelas.tsx` *(daftar kelas sesuai role)*
  - `src/app/(app)/kelas/[id].tsx` *(batasi aksi `ASPRAK` agar tidak bisa enroll/unenroll/kelola distribusi)*
  - `src/app/(app)/sesi/[id]/index.tsx` *(kontrol buka/tutup sesi & pantau presensi oleh `ASPRAK`)*
  - `src/app/(app)/rekap/[id].tsx` *(rekap presensi sesi oleh `ASPRAK`)*
  - `src/app/(app)/(tabs)/presensi.tsx` *(pantau presensi aktif)*

---

## 5. Checklist Verifikasi (Definition of Done)

- [ ] `npx tsc --noEmit` lulus dengan 0 error.
- [ ] `npx expo lint` lulus dengan 0 error.
- [ ] Dashboard `ASLAB` (`/dashboard-lab` & Beranda Aslab) menampilkan jumlah lab & praktikan, status setiap lab, lokasi & waktu, jadwal berlangsung/mendatang, riwayat kegiatan lab, dan riwayat keuangan denda dari Firestore.
- [ ] Filter **Hari**, **Minggu**, dan **Bulan** secara akurat mengubah data jadwal, riwayat kegiatan, dan ringkasan keuangan yang ditampilkan.
- [ ] Login sebagai `ASPRAK`: hanya bisa melihat kelas tanggung jawabnya, membuka/menutup sesi (sinkron real-time ke akun `PRAKTIKAN`), memantau presensi, dan meninjau izin — tidak ada tombol/akses manajemen lab atau distribusi praktikan.
- [ ] Pengajuan izin oleh `PRAKTIKAN` otomatis menghasilkan field `sentiment` dari `sentiment.js` + `model-edom.json` (`positif` / `negatif` / `netral`, atau `label: null` saat `unknown_vocabulary`/`empty_input` tanpa dianggap `netral`) dan tersimpan di Cloud Firestore.
- [ ] Simulasi gangguan/error pada analisis AI tetap meloloskan pengajuan & peninjauan izin dengan penanda fallback aman (`unavailable`).
- [ ] Persetujuan izin oleh `ASPRAK` menampilkan keterangan bahwa praktikan dicatat `IZIN` (*excused absence*, bukan `HADIR`) dan dibebaskan dari denda.
