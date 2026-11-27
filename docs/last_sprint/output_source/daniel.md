# Jobdesk Sprint 4 — Daniel (`SRS-4.1`)

> **Dokumen Hub:** [`srs.md`](./srs.md)  
> **Single Source of Truth:** [`kebutuhan_sprint_4.md`](../resource/kebutuhan_sprint_4.md) (Poin 1) & [`notes.md`](../resource/notes.md)  
> **Prasyarat Branching:** Mulai branching dari `main` **hanya setelah** `Commit 0` (`chore/s4-shared-foundation`) di-merge. Setelah itu pekerjaan Daniel **100% paralel** tanpa menunggu Yudha atau Zufar.

---

## 1. User Story (Format Form)

```text
Daniel - SRS-4.1 : Sebagai Aslab, saya dapat mengelola konfigurasi laboratorium (lokasi, koordinat, radius, grace period, nominal denda), memindahkan praktikan antar laboratorium, serta melakukan bulk dan single insert secara terpisah (laboratorium per mata kuliah, praktikan ke laboratorium, dan asprak ke laboratorium) menggunakan template CSV yang dapat diunduh dan pratinjau ScrollView interaktif (accept/deny/edit).
```

---

## 2. Lingkup Fitur & Ketentuan Wajib (`SRS-4.1`)

### A. Manajemen Konfigurasi Laboratorium oleh Aslab
- Menambah, melihat, mengubah, dan menghapus data laboratorium khusus oleh role **`ASLAB`**.
- Mengelola atribut lengkap laboratorium:
  - Nama lab, kode ruang, gedung, lantai, mata kuliah terkait (`courseId`).
  - Koordinat GPS (`lat`, `lng`) dan cakupan lokasi presensi (`radiusM`, `maxAccuracyM`).
  - Batasan keterlambatan waktu (*grace period* default: `defaultLateAfterMin`, misal 15 menit).
  - Nominal denda keterlambatan tetap default (`defaultFineAmount`, misal Rp10.000) yang akan dibaca oleh engine denda (`SRS-4.4`).

### B. 3 Fitur Bulk / Single Insert Terpisah + Template CSV + ScrollView Review
> **Larangan Kritis:** Ketiga fitur bulk insert **WAJIB dipisah** menjadi 3 alur/layar terpisah — **bukan** satu fitur bulk insert gabungan.

1. **Bulk / Single Insert Laboratorium (berdasarkan 1 Mata Kuliah)** → `/lab/bulk-lab`
   - Aslab memilih 1 mata kuliah target, lalu menambah banyak lab sekaligus via upload `.csv` atau input satuan.
2. **Bulk / Single Insert Praktikan ke Laboratorium / Kelas Tertentu** → `/lab/bulk-praktikan`
   - Aslab memilih lab/kelas target, lalu memasukkan daftar praktikan via upload `.csv` atau input satuan.
3. **Bulk / Single Insert Asprak ke Laboratorium / Kelas Tertentu** → `/lab/bulk-asprak`
   - Aslab memilih lab/kelas target, lalu memasukkan/menugaskan daftar asprak via upload `.csv` atau input satuan.

**Ketentuan Template CSV & UX Pratinjau:**
- Sediakan tombol **Download Template `.csv`** di masing-masing dari 3 layar bulk insert (memanfaatkan `expo-file-system` + `expo-sharing` untuk native, dan Blob download untuk web).
- **Skema kolom 3 file CSV** (`template_labs.csv`, `template_praktikan.csv`, `template_asprak.csv`) ditentukan dan didokumentasikan oleh Daniel di `src/lib/csv-bulk.ts` saat implementasi.
- Setelah file `.csv` diunggah/di-parse, setiap baris (*row*) **WAJIB** dirender ke dalam daftar interaktif berbasis **`ScrollView`** (kartu per baris) di mana Aslab dapat secara fleksibel:
  - Menandai baris sebagai **Accept** atau **Deny** (baris `Deny` dilewati saat simpan).
  - **Mengedit / mengisi field yang kosong** atau memperbaiki data tidak valid secara *inline* sebelum menekan tombol **Simpan Semua yang Diterima**.
  - Melihat indikator validasi per baris (misal: field wajib kosong, NIM duplikat, koordinat tidak valid).

### C. Pemindahan Praktikan Antar Laboratorium & Pengelolaan Aslab/Asprak
- Layar pemindahan praktikan (`/lab/transfer`):
  - Aslab memilih lab/kelas asal, memilih 1 atau beberapa praktikan, lalu memilih lab/kelas tujuan.
  - Memperbarui keanggotaan `studentNims` secara atomik di server (`transferStudent`), tanpa menghapus riwayat presensi lama praktikan.
- Memastikan pengelolaan akun/penugasan Aslab & Asprak di `/admin` dan pembuatan kelas di `/kelas/baru` sepenuhnya bekerja di bawah role **`ASLAB`**.
- **Batasan Scope:** Tidak perlu fitur pemindahan jadwal praktikum — cukup pemindahan praktikan dan penugasan aslab/asprak saja.

---

## 3. Rencana Branching (`feat/`, `fix/`, `chore/`)

| Urutan | Nama Branch | Fokus Deliverable |
| :---: | :--- | :--- |
| 1 | `feat/s4-lab-config-aslab` | Update layar daftar/detail/edit lab (`radiusM`, `defaultLateAfterMin`, `defaultFineAmount`, `courseId`), proteksi role `ASLAB`, dan penyesuaian `/admin` & `/kelas/baru`. |
| 2 | `feat/s4-bulk-insert-csv` | Parser & generator template CSV (`src/lib/csv-bulk.ts`), komponen reusable `BulkReviewList` berbasis `ScrollView` (Accept/Deny/Edit inline), implementasi server actions `bulkInsertLabs`, `bulkInsertStudents`, `bulkInsertAssistants`, dan 3 layar terpisah (`/lab/bulk-lab`, `/lab/bulk-praktikan`, `/lab/bulk-asprak`). |
| 3 | `feat/s4-transfer-praktikan` | Server action `transferStudent` dan layar `/lab/transfer` untuk memindahkan praktikan antar lab/kelas secara atomik + audit log. |

---

## 4. Physical File Ownership (Exclusive — Nol Konflik)

Daniel memiliki kepemilikan penuh atas file-file berikut dan **tidak boleh** mengedit file milik Yudha atau Zufar:

- **Logic & Utilities:**
  - `src/data/actions-aslab.ts` *(implementasi fungsi stub dari Commit 0: `transferStudent`, `bulkInsertLabs`, `bulkInsertStudents`, `bulkInsertAssistants`)*
  - `src/lib/csv-bulk.ts` *(template CSV generator, downloader cross-platform, dan CSV parser + row validator)*
- **Komponen UI Baru:**
  - `src/components/aslab/bulk-review-list.tsx` *(`ScrollView` interaktif per baris dengan toggle Accept/Deny + inline edit field kosong)*
  - `src/components/aslab/csv-upload-card.tsx` *(tombol Download Template CSV + Pick/Upload CSV file)*
  - `src/components/aslab/transfer-picker.tsx` *(selector asal/tujuan lab & daftar praktikan)*
- **Layar Expo Router:**
  - `src/app/(app)/lab/index.tsx` *(daftar lab + tombol akses cepat ke 3 fitur bulk insert & transfer khusus `ASLAB`)*
  - `src/app/(app)/lab/[id]/index.tsx` *(detail lab: lokasi, koordinat, radius, grace period, nominal denda)*
  - `src/app/(app)/lab/[id]/edit.tsx` *(form tambah/edit lab lengkap dengan pengaturan radius, grace period, nominal denda)*
  - `src/app/(app)/lab/bulk-lab.tsx` *(Bulk / Single Insert Lab per 1 Mata Kuliah)*
  - `src/app/(app)/lab/bulk-praktikan.tsx` *(Bulk / Single Insert Praktikan ke Lab/Kelas)*
  - `src/app/(app)/lab/bulk-asprak.tsx` *(Bulk / Single Insert Asprak ke Lab/Kelas)*
  - `src/app/(app)/lab/transfer.tsx` *(Pemindahan Praktikan antar Lab/Kelas)*
  - `src/app/(app)/(tabs)/admin.tsx` *(Manajemen user & penugasan Aslab/Asprak)*
  - `src/app/(app)/kelas/baru.tsx` *(Pembuatan kelas baru oleh Aslab)*

> **Catatan Dependency:** Bila butuh document picker untuk upload CSV di native, instal melalui `npx expo install expo-document-picker` (sesuai aturan `AGENTS.md`), atau gunakan input file standar di web + `expo-document-picker` di native.

---

## 5. Checklist Verifikasi (Definition of Done)

- [ ] `npx tsc --noEmit` lulus dengan 0 error.
- [ ] `npx expo lint` lulus dengan 0 error.
- [ ] Role `ASLAB` dapat menambah/mengubah lab termasuk koordinat, radius validasi presensi, *grace period* (`defaultLateAfterMin`), dan nominal denda (`defaultFineAmount`).
- [ ] Role `ASPRAK` dan `PRAKTIKAN` tidak dapat mengakses kontrol edit/bulk/transfer lab (UI disembunyikan & server menolak dengan `403 forbidden`).
- [ ] Ketiga fitur bulk insert (`/lab/bulk-lab`, `/lab/bulk-praktikan`, `/lab/bulk-asprak`) **terpisah**, masing-masing menyediakan **download template `.csv`** dan opsi **single insert**.
- [ ] Upload CSV menampilkan seluruh baris di dalam **`ScrollView`**; Aslab bisa **Accept**, **Deny**, dan **mengisi/mengubah kolom kosong** sebelum submit, dan hanya baris berstatus Accept + valid yang tersimpan ke Firestore.
- [ ] Pemindahan praktikan antar lab/kelas memindahkan `nim` dari kelas asal ke tujuan dengan bersih tanpa duplikasi dan tercatat di audit log.
