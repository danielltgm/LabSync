# Software Requirements Specification (SRS)
## Proyek: LabSync - Sistem Manajemen Praktikum Laboratorium
### Sprint 1: Antarmuka dan Alur Praktikum (UI & Interaction Flow)

---

## 1. Introduction & Project Scope

### 1.1 Purpose (Tujuan)
Dokumen **Software Requirements Specification (SRS)** ini merinci kebutuhan fungsional, non-fungsional, batasan bisnis, dan kriteria verifikasi untuk pengembangan aplikasi mobile **LabSync** pada **Sprint 1: Antarmuka dan Alur Praktikum**. Dokumen ini menjadi acuan tunggal (*single source of truth*) bagi Project Manager, Software Engineers (Programmer), dan Tim Quality Assurance dalam merancang dan memvalidasi antarmuka serta interaksi sistem sebelum melangkah ke integrasi database di Sprint berikutnya.

### 1.2 Scope (Cakupan & Batasan Sistem)
- **Cakupan Fitur Sprint 1 (*In-Scope*)**:
  1. **Manajemen Tampilan Jadwal & Detail Sesi**: Menampilkan daftar sesi praktikum beserta meta data (mata praktikum, kelas, ruang lab, jadwal waktu, status sesi).
  2. **Pengelolaan Siklus Sesi (Khusus Asisten)**: Mekanisme buka sesi (`TERJADWAL` -> `DIBUKA`) dan tutup sesi (`DIBUKA` -> `SELESAI`) disertai modal konfirmasi.
  3. **Pencatatan Presensi Mandiri (Khusus Praktikan)**: Formulir input kehadiran interaktif dengan validasi pencegahan presensi ganda (*anti-duplicate check-in*) dan modal feedback keberhasilan.
  4. **Rekapitulasi Kehadiran Sederhana**: Tampilan daftar mahasiswa yang hadir beserta waktu check-in untuk asisten, serta riwayat kehadiran pribadi untuk praktikan.
  5. **Simulasi Peran (*Role & Identity Switcher*)**: Komponen antarmuka untuk beralih antara peran Asisten dan Praktikan (pilihan identitas dummy) guna memvalidasi keseluruhan alur sistem dalam satu perangkat.
  6. **Penanganan Tampilan Kosong (*Empty State*)**: Visualisasi informatif ketika daftar jadwal, rekap presensi, atau riwayat belum memiliki data.
  7. **Implementasi Layout & Navigasi**: Penerapan murni Flexbox, StyleSheet, dan Expo Router.
- **Batasan Sistem Sprint 1 (*Out-of-Scope*)**:
  1. Tidak terhubung ke basis data eksternal (*No SQL/NoSQL Database*) maupun backend server (Cloud/REST/GraphQL API).
  2. Tidak ada mekanisme sinkronisasi data antar perangkat lewat jaringan (*no multi-device network sync*). Sesuai arahan teknis: *data disimpan dalam memory state aplikasi lokal selama runtime berlangsung*.
  3. Tidak ada sistem autentikasi password/biometrik sesungguhnya (disimulasikan melalui Role Switcher UI).

### 1.3 Definitions & Acronyms (Istilah & Singkatan)
- **SRS**: Software Requirements Specification.
- **PRD**: Product Requirements Document (tersedia terpisah pada [prd.md](file:///C:/Users/Daniel/LabSync/docs/prd.md)).
- **ERD**: Entity Relationship Document (tersedia terpisah pada [erd.md](file:///C:/Users/Daniel/LabSync/docs/erd.md)).
- **RTM**: Requirement Traceability Matrix.
- **FR**: Functional Requirement.
- **BR**: Business Rule.
- **NFR**: Non-Functional Requirement.
- **Asisten**: Pengguna dengan hak kelola pembukaan sesi, penutupan sesi, dan pemantauan rekapitulasi kehadiran seluruh praktikan.
- **Praktikan**: Mahasiswa peserta praktikum dengan hak melakukan presensi pada sesi yang aktif dan melihat riwayat kehadirannya sendiri.
- **Sesi Praktikum (*Session*)**: Satu unit kegiatan praktikum pada mata kuliah, kelas, ruang lab, dan rentang jam tertentu.
- **Status Sesi**: Tahapan operasional sesi (`TERJADWAL` / *Scheduled*, `DIBUKA` / *Open*, `SELESAI` / *Closed*).
- **Empty State**: Tampilan antarmuka khusus yang muncul ketika suatu daftar atau kumpulan data tidak memiliki item sama sekali.

### 1.4 References (Dokumen Acuan)
1. **IEEE Std 830-1998 / ISO/IEC/IEEE 29148:2018**: Standard for Software and Systems Engineering — Software Requirements Specification.
2. **LabSync Product Requirements Document**: [docs/prd.md](file:///C:/Users/Daniel/LabSync/docs/prd.md).
3. **LabSync Entity Relationship Document**: [docs/erd.md](file:///C:/Users/Daniel/LabSync/docs/erd.md).
4. **React Native Official Documentation**:
   - React Fundamentals: https://reactnative.dev/docs/intro-react?language=typescript&guide=android
   - Flexbox Layout: https://reactnative.dev/docs/flexbox?language=javascript
   - Handling Text Input & State: https://reactnative.dev/docs/handling-text-input
   - Modal Component: https://reactnative.dev/docs/modal
   - StyleSheet: https://reactnative.dev/docs/style
5. **Expo Router Navigation Documentation**: https://docs.expo.dev/tutorial/add-navigation/

---

## 2. Overall Description

### 2.1 Product Perspective (Posisi Sistem)
LabSync pada Sprint 1 bertindak sebagai aplikasi mobile *stand-alone prototype*. Seluruh komponen UI berinteraksi secara reaktif dengan lapisan *In-Memory State Store* (React Context / Hooks). Arsitektur ini dirancang modular sehingga antarmuka siap dipasangkan dengan REST API atau Cloud Database (Supabase/Firebase) pada Sprint berikutnya tanpa mengubah struktur presentasi.

```
+-------------------------------------------------------------+
|                LabSync Mobile UI (Expo / RN)                |
|  [Role Switcher] | [Session List] | [Form Presensi & Modal]  |
+-------------------------------------------------------------+
                              |
                     React State / Context
                              |
+-------------------------------------------------------------+
|              In-Memory Mock Store (Sprint 1)                |
|    - DUMMY_USERS                                            |
|    - INITIAL_SESSIONS (State: Terjadwal/Dibuka/Selesai)     |
|    - ATTENDANCE_RECORDS (State: Check-in log)               |
+-------------------------------------------------------------+
```

### 2.2 User Classes & Roles (Kelas Pengguna & Peran)
1. **Asisten Laboratorium**:
   - Memiliki wewenang manajerial terhadap siklus sesi.
   - Hak akses: Membuka sesi, menutup sesi, melihat seluruh daftar praktikan yang telah presensi pada sesi terkait.
2. **Praktikan (Mahasiswa)**:
   - Pengguna operasional praktikum.
   - Hak akses: Melihat informasi sesi, melakukan presensi saat sesi berstatus `DIBUKA`, melihat riwayat kehadiran pribadi.
3. **Evaluator / Tester (Reviewer)**:
   - Menggunakan fitur *Role Switcher* untuk berganti perspektif peran secara instan guna memverifikasi alur end-to-end tanpa login ulang.

### 2.3 Operating Environment (Lingkungan Operasi)
- **Framework**: React Native 0.88.x dengan Expo SDK 58.x (TypeScript).
- **Arsitektur Navigasi**: Expo Router (File-based routing pada `src/app/`).
- **Platform Sasaran**: Android (API level 24+) dan iOS (iOS 14+), serta kompatibel dijalankan di Expo Go maupun web browser untuk preview cepat.
- **Rasio Layar Minimum**: Perangkat mobile dengan lebar resolusi 360dp atau lebih tinggi.

### 2.4 Assumptions & Dependencies (Asumsi & Ketergantungan)
- **Asumsi**:
  - Simulasi alur kedua peran dijalankan pada satu perangkat yang sama (*single device simulation*) menggunakan komponen switch role.
  - Reset aplikasi (*reload*) akan mengembalikan data ke dataset inisial dummy.
- **Ketergantungan**:
  - Pustaka bawaan Expo/React Native: `react-native`, `expo-router`, `react-native-safe-area-context`, `@expo/vector-icons` (jika diperlukan icon visual).
  - Tidak ada dependensi external cloud service pada Sprint 1.

### 2.5 Constraints (Batasan Teknis)
- **No Database / No Network Backend**: Tidak ada persistensi disk permanen atau transmisi jaringan internet pada Sprint 1.
- **Strict Mobile-First Flexbox**: Dilarang menggunakan penataan posisi absolut yang merusak responsivitas perangkat yang berbeda resolusi.
- **TypeScript Strictness**: Seluruh properti dan state harus bertipe data jelas (`strict: true`).

---

## 3. Functional Requirements (FR)

Setiap kebutuhan fungsional dilengkapi dengan ID, aktor, prioritas (High/Medium/Low), dan kriteria verifikasi.

### FR-01: Tampilan Daftar Jadwal & Detail Sesi
- **Aktor**: Asisten, Praktikan, Evaluator.
- **Prioritas**: High (Must Have).
- **Deskripsi**: Sistem harus menampilkan daftar kartu jadwal sesi praktikum yang memuat informasi nama praktikum, kode kelas, ruangan lab, waktu pelaksanaan (jam mulai - jam selesai), tanggal, dan status sesi.
- **Kriteria Verifikasi (Acceptance Criteria)**:
  - Kartu sesi menampilkan teks nama mata kuliah, kelas, lab, dan jam dengan jelas.
  - Status sesi ditampilkan menggunakan badge visual dengan variasi warna:
    - `TERJADWAL`: Abu-abu / Netral.
    - `DIBUKA`: Hijau / Emerald.
    - `SELESAI`: Merah / Gelap.
  - Menampilkan komponen *empty state* jika daftar sesi bernilai kosong.

### FR-02: Simulasi Pemilihan Peran & Identitas (Role Switcher)
- **Aktor**: Evaluator / Tester, Asisten, Praktikan.
- **Prioritas**: High (Must Have).
- **Deskripsi**: Sistem harus menyediakan kontrol antarmuka di bagian atas (header) untuk beralih antara peran **Asisten** dan **Praktikan**, serta memilih akun praktikan aktif (misal: Agil Saputra atau Zufar Ramadhan).
- **Kriteria Verifikasi (Acceptance Criteria)**:
  - Tersedia tombol pill/segmented toggle yang jelas antara `Asisten` dan `Praktikan`.
  - Saat peran Praktikan aktif, terdapat opsi untuk memilih identitas dummy mahasiswa.
  - Perubahan peran langsung mengubah konteks hak akses UI pada layar secara reaktif tanpa perlu reload.

### FR-03: Pembukaan Sesi Praktikum oleh Asisten
- **Aktor**: Asisten.
- **Prioritas**: High (Must Have).
- **Deskripsi**: Sistem harus memungkinkan asisten mengubah status sesi praktikum dari `TERJADWAL` menjadi `DIBUKA`.
- **Kriteria Verifikasi (Acceptance Criteria)**:
  - Tombol "Buka Sesi" hanya terlihat/aktif ketika peran adalah Asisten dan status sesi masih `TERJADWAL`.
  - Menekan tombol "Buka Sesi" memunculkan modal dialog konfirmasi (*"Apakah Anda yakin ingin membuka sesi praktikum ini?"*).
  - Ketika dikonfirmasi, status sesi segera berubah menjadi `DIBUKA` dan badge status terupdate seketika menjadi hijau.

### FR-04: Penutupan Sesi Praktikum oleh Asisten
- **Aktor**: Asisten.
- **Prioritas**: High (Must Have).
- **Deskripsi**: Sistem harus memungkinkan asisten mengubah status sesi praktikum dari `DIBUKA` menjadi `SELESAI`.
- **Kriteria Verifikasi (Acceptance Criteria)**:
  - Tombol "Tutup Sesi" hanya terlihat/aktif ketika peran adalah Asisten dan status sesi sedang `DIBUKA`.
  - Menekan tombol "Tutup Sesi" memunculkan modal dialog konfirmasi penutupan sesi.
  - Ketika dikonfirmasi, status sesi berubah menjadi `SELESAI`, badge berubah merah, dan aksi buka/presensi terkunci.

### FR-05: Formulir Presensi Kehadiran Praktikan
- **Aktor**: Praktikan.
- **Prioritas**: High (Must Have).
- **Deskripsi**: Sistem harus menyediakan antarmuka berupa form input (dalam modal atau layar khusus) bagi praktikan untuk melakukan presensi pada sesi yang sedang dibuka.
- **Kriteria Verifikasi (Acceptance Criteria)**:
  - Tombol "Lakukan Presensi" hanya aktif jika status sesi bernilai `DIBUKA`.
  - Jika sesi `TERJADWAL` atau `SELESAI`, tombol dalam kondisi non-aktif (*disabled*) dengan label penjelas.
  - Form memuat input NIM, Nama Lengkap (terisi otomatis sesuai profil aktif), dan input catatan opsional (misal: Nomor Meja / PC).

### FR-06: Validasi Presensi Ganda (Anti-Duplicate Check-in)
- **Aktor**: Praktikan, Sistem.
- **Prioritas**: High (Must Have).
- **Deskripsi**: Sistem harus memvalidasi data presensi dan menolak pencatatan apabila praktikan dengan NIM yang sama telah terdaftar hadir pada sesi praktikum yang sama.
- **Kriteria Verifikasi (Acceptance Criteria)**:
  - Ketika praktikan yang sudah presensi mencoba mengirim form presensi kembali pada sesi yang sama, sistem menggagalkan aksi tersebut.
  - Sistem menampilkan pesan peringatan ramah: *"Anda sudah melakukan presensi pada sesi ini sebelumnya!"*.
  - Tidak ada data duplikat yang ditambahkan ke rekapitulasi.

### FR-07: Feedback Visual & Notifikasi Presensi Berhasil
- **Aktor**: Praktikan.
- **Prioritas**: High (Must Have).
- **Deskripsi**: Sistem harus memberikan konfirmasi visual seketika setelah formulir presensi berhasil dicatat.
- **Kriteria Verifikasi (Acceptance Criteria)**:
  - Menampilkan modal feedback yang memuat ikon sukses (centang hijau), pesan keberhasilan presensi, nama mahasiswa, nama sesi, dan stempel waktu kehadiran (format `HH:mm:ss`).
  - Terdapat tombol "Selesai" / "Tutup" untuk kembali ke tampilan utama.

### FR-08: Rekapitulasi Presensi Sesi (Sisi Asisten)
- **Aktor**: Asisten.
- **Prioritas**: High (Must Have).
- **Deskripsi**: Sistem harus menampilkan daftar seluruh mahasiswa yang telah melakukan presensi pada suatu sesi praktikum secara terperinci.
- **Kriteria Verifikasi (Acceptance Criteria)**:
  - Asisten dapat mengakses layar atau tab rekapitulasi dari sesi terkait.
  - Menampilkan kartu ringkasan total praktikan yang hadir (contoh: *"Total Hadir: 1 Praktikan"*).
  - Setiap baris item rekapitulasi memuat: Inisial/Avatar, Nama Lengkap, NIM, Waktu Presensi (Jam:Menit:Detik), dan Catatan PC.
  - Jika belum ada mahasiswa yang presensi, sistem menampilkan komponen *empty state* dengan teks *"Belum ada praktikan yang melakukan presensi"*.

### FR-09: Catatan Riwayat Kehadiran Pribadi (Sisi Praktikan)
- **Aktor**: Praktikan.
- **Prioritas**: High (Must Have).
- **Deskripsi**: Sistem harus memungkinkan praktikan melihat catatan dan status kehadiran pribadinya pada sesi praktikum.
- **Kriteria Verifikasi (Acceptance Criteria)**:
  - Praktikan dapat melihat indikator apakah dirinya sudah tercatat hadir pada sesi praktikum yang sedang aktif atau yang telah selesai.
  - Jika belum pernah presensi, tampil pesan penjelas bahwa belum ada riwayat kehadiran.

### FR-10: Penanganan Kondisi Data Kosong (Empty State Handling)
- **Aktor**: Sistem, Seluruh Pengguna.
- **Prioritas**: Medium (Should Have).
- **Deskripsi**: Sistem harus memiliki komponen antarmuka ramah pengguna ketika daftar jadwal, daftar rekap kehadiran, atau riwayat tidak memiliki data.
- **Kriteria Verifikasi (Acceptance Criteria)**:
  - Tidak memunculkan layar putih kosong (*blank screen*).
  - Memuat ikon ilustrasi visual, judul kondisi kosong, dan deskripsi instruktif.

---

## 4. Business Rules (BR)

Business Rules mendefinisikan regulasi proses bisnis praktikum yang wajib dipatuhi oleh seluruh fungsi sistem:

| ID | Nama Aturan Bisnis | Deskripsi & Kebijakan | Rationale & Dampak Sistem |
| :--- | :--- | :--- | :--- |
| **BR-01** | **Hak Eksklusif Pengelolaan Sesi** | Hanya pengguna dengan peran `ASISTEN` yang memiliki hak membuka atau menutup sesi praktikum. | Menjamin otoritas lab. Praktikan dilarang keras melihat atau memicu tombol kontrol sesi. |
| **BR-02** | **Prasyarat Presensi Berdasarkan Status Sesi** | Presensi praktikan **hanya sah dan dapat dilakukan** apabila status sesi praktikum bernilai `DIBUKA`. | Praktikan tidak boleh presensi mendahului waktu (`TERJADWAL`) atau menyusul setelah lab usai (`SELESAI`). |
| **BR-03** | **Aturan Anti-Duplicate Presensi** | Satu identitas praktikan (NIM unik) hanya diperbolehkan melakukan presensi tepat **1 (satu) kali** pada sesi yang sama. | Mencegah kecurangan, pengiriman ganda akibat ketidaksabaran pengguna, serta inkonsistensi hitungan kehadiran. |
| **BR-04** | **Immutabilitas Sesi Ditutup (*Closed Session Lock*)** | Sesi praktikum yang telah berstatus `SELESAI` bersifat permanen/terkunci pada Sprint 1. Tidak dapat dibuka kembali dan tidak dapat menerima presensi baru. | Menjamin integritas data akhir kegiatan praktikum setelah asisten resmi menutup lab. |
| **BR-05** | **Konfirmasi Tindakan Kritis** | Setiap aksi perubahan status sesi (Buka Sesi dan Tutup Sesi) **wajib melalui modal konfirmasi eksplisit**. | Menghindari *accidental click* dari asisten yang dapat berakibat fatal pada alur presensi praktikan. |
| **BR-06** | **Privasi & Visibilitas Rekapitulasi** | Asisten berhak melihat rekapitulasi seluruh mahasiswa pada sesi yang diampunya, sedangkan praktikan hanya berhak melihat catatan kehadirannya sendiri. | Menjaga kerapian informasi dan fokus kebutuhan pengguna sesuai perannya. |

---

## 5. Non-Functional Requirements (NFR)

### 5.1 Performance (Kinerja & Kecepatan Respons)
- **NFR-01.1**: Waktu render komponen antarmuka tidak boleh melebihi 100 milidetik saat beralih peran atau membuka modal.
- **NFR-01.2**: Animasi pembukaan modal dan scroll daftar sesi/rekap harus berjalan mulus pada kecepatan 60 frame per detik (FPS) tanpa *jank*.
- **NFR-01.3**: Pemrosesan validasi formulir presensi dan pencatatan state lokal harus selesai secara instan (< 50 milidetik).

### 5.2 Usability & Accessibility (Kemudahan Penggunaan)
- **NFR-02.1**: Seluruh tombol interaktif memiliki ukuran area ketuk (*touch target*) minimal 44x44 density-independent pixels (dp).
- **NFR-02.2**: Kontras warna antara teks dan latar belakang memenuhi standar WCAG 2.1 AA (rasio kontras minimal 4.5:1).
- **NFR-02.3**: Setiap field input teks pada form dilengkapi placeholder dan label yang jelas.
- **NFR-02.4**: Pesan galat (*error message*) disajikan dengan bahasa Indonesia yang jelas, sopan, dan mengarahkan tindakan perbaikan.

### 5.3 Reliability & Availability (Keandalan Sistem)
- **NFR-03.1**: Aplikasi tidak boleh mengalami *crash* (*zero unhandled exception*) ketika menerima masukan form kosong, format NIM tidak valid, atau saat data daftar kosong.
- **NFR-03.2**: State data lokal harus persisten selama aplikasi aktif di foreground/background (sebelum proses ditutup atau di-reload).

### 5.4 Maintainability & Code Quality (Kualitas Kode)
- **NFR-04.1**: Kode sumber wajib mematuhi standar *Clean Architecture* berbasis komponen React Native yang terpisah antara *presentational components* dan *state container*.
- **NFR-04.2**: Proyek harus lolos typecheck TypeScript (`npx tsc --noEmit`) dengan 0 error.
- **NFR-04.3**: Tidak ada pelanggaran linting (`npx expo lint`).
- **NFR-04.4**: Seluruh styling wajib menggunakan `StyleSheet.create()` bawaan React Native dan Flexbox, tanpa inline style berlebihan.

### 5.5 Portability (Portabilitas Perangkat)
- **NFR-05.1**: Tata letak antarmuka harus responsif dan proporsional pada platform Android dan iOS dengan memanfaatkan `SafeAreaView`.

---

## 6. Data Requirements

Struktur data lengkap, kamus data, dan diagram relasi entitas didokumentasikan secara terpisah pada [docs/erd.md](file:///C:/Users/Daniel/LabSync/docs/erd.md). Ringkasan kebutuhan data adalah sebagai berikut:

### 6.1 Entitas & Atribut Kunci
1. **User (`UserProfile`)**:
   - `id`: string (UUID unik).
   - `identifier`: string (NIM untuk Praktikan, Kode/NIP untuk Asisten).
   - `name`: string (Nama Lengkap).
   - `role`: enum (`'ASISTEN' | 'PRAKTISAN'`).
   - `className`: string opsional (contoh: `'IF-3A'`).
2. **Session (`Session`)**:
   - `id`: string (UUID sesi).
   - `courseName`: string (Nama Praktikum).
   - `className`: string (Kelas Peserta).
   - `labRoom`: string (Nama Laboratorium).
   - `date`: string (Format `YYYY-MM-DD`).
   - `startTime` & `endTime`: string (Format `HH:mm`).
   - `status`: enum (`'TERJADWAL' | 'DIBUKA' | 'SELESAI'`).
   - `assistantName`: string (Nama Asisten Pengampu).
3. **Attendance (`AttendanceRecord`)**:
   - `id`: string (UUID presensi).
   - `sessionId`: string (Foreign Key ke Sesi).
   - `studentId`: string (NIM Praktikan).
   - `studentName`: string (Nama Praktikan).
   - `className`: string (Kelas Praktikan).
   - `checkInTime`: string (Format `HH:mm:ss`).
   - `notes`: string opsional (Nomor PC/Meja).

### 6.2 Validasi & Batasan Data
- Format jam presensi menggunakan waktu lokal sistem (`new Date().toLocaleTimeString('id-ID')`).
- Field `studentId` dan `sessionId` bersifat wajib (*mandatory*).
- Validasi integritas: Satu pasangan `(sessionId, studentId)` bersifat unik.

### 6.3 Siklus Hidup & Retensi Data Sprint 1
- Seluruh data bertempat di memori runtime JavaScript aplikasi.
- Dataset awal (*initial state*) di-seed dari file `src/constants/dummy-data.ts`.

---

## 7. Interfaces & System Integration

### 7.1 User Interface Requirements (Persyaratan Antarmuka)
1. **Prinsip Flexbox**:
   - Semua halaman menggunakan `flex: 1` dengan `SafeAreaView` sebagai pembungkus utama.
   - Penataan kartu, header, dan item daftar menggunakan `flexDirection: 'row'`, `alignItems: 'center'`, dan `justifyContent: 'space-between'`.
2. **Modal & Feedback**:
   - Dialog konfirmasi pembukaan dan penutupan sesi menggunakan komponen `Modal` React Native dengan latar belakang semi-transparan (`rgba(0,0,0,0.5)`).
   - Form presensi praktikan disajikan melalui modal atau bottom sheet interaktif.
   - Umpan balik keberhasilan presensi menampilkan rincian waktu kehadiran dan ikon konfirmasi.
3. **Color-Coded Status Badge**:
   - Indikator status sesi memiliki pembeda visual yang kuat untuk meminimalkan ambiguitas pengguna.

### 7.2 Screen & Navigation Architecture (Expo Router)
Struktur navigasi file-based Expo Router disusun sebagai berikut:

```
src/app/
├── _layout.tsx           # Root navigator & SafeArea / Context Provider
├── index.tsx             # Halaman Beranda (Header, Role Switcher, & Daftar Sesi)
├── rekap/
│   └── [id].tsx          # Halaman Rekapitulasi Presensi Sesi (Khusus Asisten)
└── history.tsx           # Halaman Catatan Kehadiran Pribadi (Khusus Praktikan)
```

### 7.3 System & External Integration
- **Fase Sprint 1**: Sistem terisolasi secara lokal (*offline in-memory mock*).
- **Protokol Masa Depan (Sprint 2 Ready)**: Arsitektur state store dirancang menggunakan pola *Repository Pattern* atau *React Context Action Dispatcher* sehingga pemanggilan fungsi lokal (seperti `checkInSession`, `openSession`, `closeSession`) dapat langsung digantikan dengan pemanggilan HTTP/REST client Axios/Fetch pada Sprint 2 tanpa mengubah komponen UI.

---

## 8. Verification, Acceptance & Traceability

### 8.1 Acceptance Criteria Alur Demonstrasi Sprint 1
Sprint 1 dinyatakan **LULUS (Accepted)** apabila alur demonstrasi 5 tahap berikut dapat dijalankan secara konsisten pada antarmuka aplikasi:

1. **Tahap 1 (Asisten Membuka Sesi)**:
   - Penguji memilih peran **Asisten**.
   - Penguji memilih sesi berstatus `TERJADWAL` (contoh: *Pemrograman Mobile*).
   - Penguji menekan tombol **"Buka Sesi"** -> Modal konfirmasi muncul -> Penguji klik konfirmasi.
   - Status sesi seketika berubah menjadi `DIBUKA` (badge warna hijau).
2. **Tahap 2 (Praktikan Melakukan Presensi)**:
   - Penguji beralih peran ke **Praktikan** (pilih akun: *Agil Saputra*).
   - Sesi *Pemrograman Mobile* terlihat berstatus `DIBUKA`.
   - Penguji menekan tombol **"Lakukan Presensi"** -> Form muncul -> Masukkan catatan PC -> Klik kirim.
   - Modal feedback sukses muncul menampilkan waktu kehadiran tercatat.
3. **Tahap 3 (Validasi Anti-Presensi Ganda)**:
   - Penguji (tetap dengan akun *Agil Saputra*) mencoba menekan tombol presensi kembali pada sesi yang sama.
   - Sistem menolak proses dan menampilkan pesan peringatan bahwa praktikan sudah tercatat hadir.
4. **Tahap 4 (Asisten Memantau Rekap & Menutup Sesi)**:
   - Penguji beralih peran kembali ke **Asisten**.
   - Penguji membuka halaman **Rekapitulasi Presensi** pada sesi terkait.
   - Nama *Agil Saputra* beserta jam kehadiran dan catatan PC tampil di dalam daftar, dengan total kehadiran bertambah menjadi 1.
   - Penguji menekan tombol **"Tutup Sesi"** -> Modal konfirmasi muncul -> Penguji klik konfirmasi.
   - Status sesi berubah menjadi `SELESAI` (badge warna merah).
5. **Tahap 5 (Verifikasi Akhir Praktikan)**:
   - Penguji beralih peran ke **Praktikan**.
   - Pada sesi yang berstatus `SELESAI`, tombol presensi terkunci/disabled.
   - Penguji membuka menu **Riwayat Kehadiran** dan melihat status kehadirannya tercatat "Hadir".

### 8.2 Requirement Traceability Matrix (RTM)

Matriks keterlacakan ini memetakan hubungan antara User Story, Functional Requirement (FR), Business Rule (BR), Komponen/Layar UI, dan Test Case verifikasi:

| US ID | Functional Req (FR) | Business Rule (BR) | Komponen & Layar Implementasi | Kode Uji / Test Case |
| :--- | :--- | :--- | :--- | :--- |
| **US-01** | FR-01, FR-10 | BR-06 | `SessionCard.tsx`, `EmptyState.tsx`, `src/app/index.tsx` | `TC-01`: Render daftar sesi & status badge |
| **US-02** | FR-03, FR-04 | BR-01, BR-04, BR-05 | `SessionControlAction.tsx`, `ConfirmationModal.tsx` | `TC-02`: Buka sesi praktikum via modal<br>`TC-03`: Tutup sesi praktikum via modal |
| **US-03** | FR-05, FR-06, FR-07 | BR-02, BR-03 | `AttendanceFormModal.tsx`, `AttendanceFeedbackModal.tsx` | `TC-04`: Submit presensi saat sesi DIBUKA<br>`TC-05`: Validasi tolak presensi ganda<br>`TC-06`: Tombol disabled jika TERJADWAL/SELESAI |
| **US-04** | FR-08, FR-09 | BR-06 | `AttendanceListItem.tsx`, `src/app/rekap/[id].tsx`, `src/app/history.tsx` | `TC-07`: Tampilan rekapitulasi kehadiran asisten<br>`TC-08`: Tampilan riwayat kehadiran praktikan |
| **US-05** | FR-02 | BR-01, BR-06 | `RoleSwitcher.tsx`, `src/app/index.tsx` | `TC-09`: Pengalihan peran Asisten <-> Praktikan |
