# Panduan Programmer & Pembagian Tugas (Sprint 1)
## Proyek: LabSync - Antarmuka dan Alur Praktikum

Dokumen ini memuat arsitektur teknis, kontrak data (TypeScript interfaces), aturan kepemilikan file (*file ownership*), serta pembagian tugas (*jobdesk*) untuk 3 programmer: **Yudha**, **Agil**, dan **Zufar**.

---

## 1. Strategi Pengembangan: Minim Dependensi & Zero-Conflict

Untuk meminimalkan potensi konflik merge (*git merge conflict*) dan saling tunggu antar programmer, tim menerapkan prinsip berikut:
1. **Strict File Ownership**: Setiap programmer memiliki file dan folder komponennya masing-masing. Programmer dilarang mengedit file milik programmer lain tanpa koordinasi.
2. **Contract-First Development**: Tipe data (*TypeScript interfaces*) dan dataset dummy disepakati di awal pada folder `src/types/` dan `src/constants/`. Programmer bekerja mengacu pada kontrak ini.
3. **Fully Dummy & In-Memory State**: Tidak ada koneksi database/backend di Sprint 1. Data disimpan pada React State / Context lokal selama aplikasi berjalan.
4. **Independent Sandbox Testing**: Setiap programmer dapat menguji layarnya sendiri secara mandiri menggunakan mock data bawaan komponen masing-masing.

---

## 2. Matriks Kepemilikan File (*File Ownership Matrix*)

| Programmer | Wilayah Tanggung Jawab Utama | File & Direktori Eksklusif |
| :--- | :--- | :--- |
| **Yudha** | **Core Shell, Role Switcher, & Sesi Asisten** | `src/types/user.ts`<br>`src/types/session.ts`<br>`src/components/common/RoleSwitcher.tsx`<br>`src/components/common/StatusBadge.tsx`<br>`src/components/common/ConfirmationModal.tsx`<br>`src/components/asisten/SessionCard.tsx`<br>`src/components/asisten/SessionControlAction.tsx`<br>`src/app/index.tsx` *(Beranda & Jadwal)* |
| **Agil** | **Alur Praktikan & Form Presensi Anti-Ganda** | `src/types/attendance.ts`<br>`src/components/praktikan/SessionPraktikanCard.tsx`<br>`src/components/praktikan/AttendanceFormModal.tsx`<br>`src/components/praktikan/AttendanceFeedbackModal.tsx`<br>`src/app/praktikan/presensi.tsx` *(Layar Presensi)* |
| **Zufar** | **Rekapitulasi Kehadiran & Riwayat (Asisten & Praktikan)** | `src/components/common/EmptyState.tsx`<br>`src/components/rekap/AttendanceListItem.tsx`<br>`src/components/rekap/AttendanceSummaryCard.tsx`<br>`src/app/rekap/[id].tsx` *(Layar Rekap Asisten)*<br>`src/app/history.tsx` *(Layar Riwayat Praktikan)* |

---

## 3. Kontrak Data & Tipe Bersama (Shared Contracts)

Seluruh programmer **wajib** mengacu pada tipe data berikut:

### 3.1 Identitas Pengguna & Peran (`src/types/user.ts`)
```typescript
export type UserRole = 'ASISTEN' | 'PRAKTISAN';

export interface UserProfile {
  id: string;
  name: string;
  identifier: string; // NIP/NIM
  role: UserRole;
  className?: string; // Khusus praktikan, contoh: 'IF-3A'
}
```

### 3.2 Sesi Praktikum (`src/types/session.ts`)
```typescript
export type SessionStatus = 'TERJADWAL' | 'DIBUKA' | 'SELESAI';

export interface Session {
  id: string;
  courseName: string;   // Contoh: 'Pemrograman Mobile'
  className: string;    // Contoh: 'IF-3A'
  labRoom: string;      // Contoh: 'Lab Multimedia 2'
  startTime: string;    // Contoh: '08:00'
  endTime: string;      // Contoh: '10:00'
  date: string;         // Contoh: '2026-10-22'
  status: SessionStatus;
  assistantName: string;
}
```

### 3.3 Presensi Kehadiran (`src/types/attendance.ts`)
```typescript
export interface AttendanceRecord {
  id: string;
  sessionId: string;
  studentId: string;    // NIM praktikan
  studentName: string;
  className: string;
  checkInTime: string;  // Contoh: '08:15:22'
  notes?: string;       // Catatan opsional (misal: 'PC 14')
}
```

### 3.4 Data Dummy Bersama (`src/constants/dummy-data.ts`)
```typescript
import { Session } from '../types/session';
import { UserProfile } from '../types/user';
import { AttendanceRecord } from '../types/attendance';

export const DUMMY_USERS: UserProfile[] = [
  { id: 'u1', name: 'Yudha Pratama', identifier: 'AST-001', role: 'ASISTEN' },
  { id: 'u2', name: 'Agil Saputra', identifier: '123210001', role: 'PRAKTISAN', className: 'IF-3A' },
  { id: 'u3', name: 'Zufar Ramadhan', identifier: '123210002', role: 'PRAKTISAN', className: 'IF-3A' },
];

export const INITIAL_SESSIONS: Session[] = [
  {
    id: 'ses-1',
    courseName: 'Pemrograman Mobile',
    className: 'IF-3A',
    labRoom: 'Lab Rekayasa Perangkat Lunak',
    startTime: '08:00',
    endTime: '10:00',
    date: '2026-10-22',
    status: 'TERJADWAL',
    assistantName: 'Yudha Pratama',
  },
  {
    id: 'ses-2',
    courseName: 'Basis Data Lanjut',
    className: 'SI-3B',
    labRoom: 'Lab Basis Data',
    startTime: '10:30',
    endTime: '12:30',
    date: '2026-10-22',
    status: 'DIBUKA',
    assistantName: 'Yudha Pratama',
  },
];

export const INITIAL_ATTENDANCES: AttendanceRecord[] = [
  {
    id: 'att-1',
    sessionId: 'ses-2',
    studentId: '123210001',
    studentName: 'Agil Saputra',
    className: 'IF-3A',
    checkInTime: '10:35:10',
    notes: 'PC-08',
  },
];
```

---

## 4. Pembagian Jobdesk & Rincian Tugas Programmer

### 👨‍💻 Programmer 1: Yudha
**Peran:** *Lead Shell, Shared Atoms & Asisten Session Control*
**Tanggung Jawab:**
Menyiapkan dasar navigasi, pemilih peran (*Role Switcher*), komponen atom visual bersama, serta seluruh interaksi sisi Asisten untuk membuka dan menutup sesi praktikum.

#### Daftar Tugas Yudha:
- [ ] **Task Y1 (Kontrak & Shared Atoms)**:
  - Buat `src/types/user.ts` dan `src/types/session.ts`.
  - Buat `src/components/common/StatusBadge.tsx`: Badge visual dengan warna adaptif (`TERJADWAL` abu-abu, `DIBUKA` hijau, `SELESAI` merah).
  - Buat `src/components/common/ConfirmationModal.tsx`: Modal pop-up dengan judul, pesan konfirmasi, tombol 'Batal', dan tombol aksi berwarna tegas.
- [ ] **Task Y2 (Role Switcher)**:
  - Buat `src/components/common/RoleSwitcher.tsx`: Komponen segmented button / pill toggle di bagian atas untuk beralih antara peran **Asisten** dan **Praktikan**, serta memilih akun praktikan aktif (Agil / Zufar).
- [ ] **Task Y3 (Jadwal & Kontrol Sesi Asisten)**:
  - Buat `src/components/asisten/SessionCard.tsx`: Kartu jadwal praktikum berisi nama mata kuliah, kelas, lab, waktu, dan status.
  - Buat `src/components/asisten/SessionControlAction.tsx`: Tombol aksi buka sesi (jika terjadwal) dan tutup sesi (jika dibuka). Menampilkan `ConfirmationModal` sebelum mengubah state sesi.
- [ ] **Task Y4 (Halaman Utama Dashboard)**:
  - Perbarui `src/app/index.tsx`: Menampilkan header aplikasi, `RoleSwitcher`, dan daftar sesi praktikum. Jika peran aktif adalah Asisten, tampilkan tombol kontrol sesi dan tombol menuju halaman rekap.

---

### 👨‍💻 Programmer 2: Agil
**Peran:** *Praktikan Experience, Form Presensi, & Validasi Anti-Ganda*
**Tanggung Jawab:**
Membangun antarmuka presensi praktikan, menangani formulir input kehadiran dengan `useState`, mencegah presensi ganda, serta menampilkan modal feedback konfirmasi presensi berhasil.

#### Daftar Tugas Agil:
- [ ] **Task A1 (Kontrak Kehadiran)**:
  - Buat `src/types/attendance.ts`.
- [ ] **Task A2 (Tampilan Sesi Praktikan)**:
  - Buat `src/components/praktikan/SessionPraktikanCard.tsx`: Kartu sesi praktikum khusus perspektif praktikan dengan status sesi dan tombol "Lakukan Presensi".
  - Berikan aturan kondisional: Tombol hanya dapat diklik jika status sesi `DIBUKA`. Jika `TERJADWAL` atau `SELESAI`, tombol dalam kondisi *disabled* dengan label keterangan.
- [ ] **Task A3 (Formulir Presensi Modal)**:
  - Buat `src/components/praktikan/AttendanceFormModal.tsx`:
    - Menggunakan `TextInput` untuk input NIM, Nama Lengkap, dan Catatan (nomor meja/PC).
    - Nilai default dapat terisi otomatis sesuai profil praktikan aktif.
    - Menggunakan Flexbox & StyleSheet untuk tata letak formulir yang rapi.
- [ ] **Task A4 (Validasi Anti-Ganda & Feedback Modal)**:
  - Implementasikan pengecekan validasi: Jika mahasiswa dengan NIM tersebut sudah ada di daftar presensi sesi tersebut, tampilkan pesan peringatan ramah: *"Anda sudah melakukan presensi pada sesi ini sebelumnya!"*.
  - Buat `src/components/praktikan/AttendanceFeedbackModal.tsx`: Modal ucapan selamat bahwa presensi berhasil, memuat nama mahasiswa, sesi, dan jam presensi tercatat.
- [ ] **Task A5 (Layar Presensi Praktikan)**:
  - Buat/hubungkan ke `src/app/praktikan/presensi.tsx` atau trigger langsung via modal di kartu praktikan pada `src/app/index.tsx`.

---

### 👨‍💻 Programmer 3: Zufar
**Peran:** *Rekapitulasi Kehadiran Asisten, Riwayat Praktikan & Empty States*
**Tanggung Jawab:**
Membangun antarmuka rekapitulasi kehadiran untuk asisten (siapa saja yang sudah presensi beserta jamnya), riwayat kehadiran pribadi untuk praktikan, dan tampilan ketika data kosong (*empty state*).

#### Daftar Tugas Zufar:
- [ ] **Task Z1 (Universal Empty State)**:
  - Buat `src/components/common/EmptyState.tsx`: Komponen visual reusable untuk menampilkan teks instruktif ketika data masih kosong (contoh: *"Belum ada mahasiswa yang melakukan presensi"*, atau *"Belum ada riwayat presensi"*).
- [ ] **Task Z2 (Item & Rekapitulasi Kehadiran Sisi Asisten)**:
  - Buat `src/components/rekap/AttendanceListItem.tsx`: Komponen item baris/kartu presensi memuat Avatar inisial nama, Nama Lengkap, NIM, Waktu Check-in, dan nomor PC/catatan.
  - Buat `src/components/rekap/AttendanceSummaryCard.tsx`: Kartu ringkasan metrik (misal: Total Mahasiswa Hadir: 18).
- [ ] **Task Z3 (Layar Rekapitulasi Sesi)**:
  - Buat `src/app/rekap/[id].tsx`:
    - Menampilkan detail informasi sesi praktikum di bagian header.
    - Menampilkan daftar mahasiswa yang hadir menggunakan `FlatList` / `ScrollView`.
    - Jika list masih kosong, panggil `EmptyState.tsx`.
    - Tombol kembali ke halaman utama.
- [ ] **Task Z4 (Layar Riwayat Kehadiran Pribadi Praktikan)**:
  - Buat `src/app/history.tsx`:
    - Menampilkan riwayat daftar sesi yang pernah diikuti oleh praktikan yang sedang aktif.
    - Menampilkan status kehadiran (Hadir pada jam sekian / Tidak Hadir).

---

## 5. Alur Integrasi & Skenario Uji Demonstrasi (End-to-End Demo)

Setelah masing-masing programmer menyelesaikan tugasnya, uji skenario berikut bersama:

```
[Langkah 1: Yudha]
Pilih Peran: ASISTEN
Pilih Sesi 'Pemrograman Mobile' (Status Awal: TERJADWAL)
Klik 'Buka Sesi' -> Konfirmasi Modal -> Status berubah jadi 'DIBUKA'

[Langkah 2: Agil]
Beralih Peran: PRAKTISAN (Akun: Agil)
Lihat Sesi 'Pemrograman Mobile' (Status terlihat: DIBUKA)
Klik 'Lakukan Presensi' -> Isi form (PC-04) -> Submit
Feedback Modal muncul: 'Presensi Berhasil jam 08:15:00'
Coba submit presensi kembali dengan akun Agil -> Ditolak: 'Sudah Presensi'

[Langkah 3: Zufar]
Beralih Peran: ASISTEN
Klik menu 'Rekap Kehadiran' pada sesi 'Pemrograman Mobile'
Daftar menampilkan: 'Agil Saputra - 123210001 - 08:15:00 - PC-04'
Total Hadir tercatat: 1

[Langkah 4: Yudha]
Asisten klik 'Tutup Sesi' -> Konfirmasi Modal -> Status berubah jadi 'SELESAI'

[Langkah 5: Zufar & Agil]
Beralih Peran: PRAKTISAN (Akun: Agil)
Buka menu 'Catatan Kehadiran Saya' -> Status sesi 'Pemrograman Mobile' tertera 'Hadir'
Tombol 'Lakukan Presensi' pada sesi tersebut kini terkunci/disabled
```

---

## 6. Referensi Teknis Resmi

- **React Fundamental & TypeScript**: https://reactnative.dev/docs/intro-react?language=typescript&guide=android
- **Flexbox Layout Guide**: https://reactnative.dev/docs/flexbox?language=javascript
- **TextInput & useState Handling**: https://reactnative.dev/docs/handling-text-input
- **React Native Modal Component**: https://reactnative.dev/docs/modal
- **StyleSheet Styling**: https://reactnative.dev/docs/style
- **Expo Router Navigation Tutorial**: https://docs.expo.dev/tutorial/add-navigation/

---

## 7. Checklist Validasi & Quality Gate Sprint 1

Sebelum menyatakan Sprint 1 selesai, seluruh tim wajib menjalankan:
1. `npx tsc --noEmit` : Memastikan tidak ada kesalahan tipe data TypeScript.
2. `npx expo lint` : Memastikan kode bersih dan mematuhi linting.
3. `npx expo start` : Menjalankan demo antarmuka dan memvalidasi alur demo kelima langkah di atas.
