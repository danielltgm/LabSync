# Pedoman Desain Antarmuka & Pengalaman Pengguna (Design.md)
## Proyek: LabSync Mobile Application (Sprint 1)
### Platform: React Native (Expo SDK 58, TypeScript, Expo Router)

---

## 1. Pendahuluan & Prinsip Desain (Design Direction)

### 1.1 Karakter Visual LabSync
**LabSync** adalah sistem operasional laboratorium akademik. Karakter visualnya harus mencerminkan:
- **Profesional, Bersih, dan Terstruktur**: Mengutamakan kejelasan data operasional (nama mata praktikum, jam, ruangan lab, dan status sesi) tanpa ornamen visual dekoratif yang membingungkan.
- **Tegas & Kritis**: Status sesi praktikum (`TERJADWAL`, `DIBUKA`, `SELESAI`) dan konfirmasi presensi harus langsung terbaca dalam pandangan pertama (< 1 detik).
- **Aman dari Salah Ketuk (*Accidental Touch Protection*)**: Tindakan krusial (membuka sesi, menutup sesi) diproteksi oleh dialog modal konfirmasi.

### 1.2 Prinsip Mobile-First & Task-Oriented UX
1. **Fokus Tugas (*Task-Oriented*)**:
   - Jika pengguna adalah **Asisten**: Tugas utamanya adalah membuka sesi saat tiba di lab, memantau jumlah mahasiswa yang hadir, dan menutup sesi ketika praktikum selesai.
   - Jika pengguna adalah **Praktikan**: Tugas utamanya adalah melihat apakah sesi sudah dibuka, mengisi form presensi mandiri, dan memastikan kehadiran tercatat.
2. **Keterjangkauan Ibu Jari (*Thumb-Zone Optimization*)**:
   - Aksi interaktif utama (tombol Buka/Tutup Sesi, tombol Lakukan Presensi, kontrol Role Switcher) ditempatkan pada posisi yang mudah dijangkau satu tangan.
3. **Pemberian Umpan Balik Instan (*Instant Deterministic Feedback*)**:
   - Setiap ketukan tombol memberikan respon visual seketika (*active opacity / ripple*).
   - Presensi yang berhasil langsung memunculkan modal dengan stempel waktu kehadiran (`HH:mm:ss`).
4. **Hal yang DILARANG / Dihindari**:
   - ❌ Menggunakan perilaku *hover* (layar sentuh mobile tidak mengenal kursor mouse).
   - ❌ Menggunakan tata letak tabel desktop yang memanjang horizontal tanpa pertimbangan ukuran layar.
   - ❌ Menggunakan ukuran tombol di bawah 44x44 dp yang menyulitkan pengetukan.
   - ❌ Menampilkan layar kosong putih (*blank screen*) saat data kosong; wajib menyertakan komponen *Empty State*.
   - ❌ Menambah status sesi atau peran fiktif baru di luar acuan `docs/srs.md`.

---

## 2. Design Tokens (Token Desain Konkret)

Seluruh coding agent **wajib** menggunakan token nilai konkret di bawah ini melalui `StyleSheet.create()` untuk menjaga konsistensi visual di seluruh layar.

### 2.1 Palet Warna (Color Palette)

#### A. Brand & Netral
| Token Name | Hex Code | Penggunaan Utama |
| :--- | :--- | :--- |
| `primary.main` | `#2563EB` | Warna identitas utama LabSync, tombol aksi primer, header highlight. |
| `primary.hover` | `#1D4ED8` | State saat tombol utama ditekan (*pressed*). |
| `primary.surface` | `#EFF6FF` | Latar belakang aksen biru pastel, container aktif. |
| `neutral.background` | `#F8FAFC` | Latar belakang layar aplikasi (*Screen Canvas*). |
| `neutral.surface` | `#FFFFFF` | Latar belakang kartu (*Card*), modal dialog, dan input container. |
| `neutral.border` | `#E2E8F0` | Garis batas (*border*) kartu, pemisah baris, dan outline form. |
| `neutral.borderDark`| `#CBD5E1` | Garis batas input saat fokus/aktif. |
| `text.primary` | `#0F172A` | Teks judul, teks kartu utama, angka penting (Sangat kontras). |
| `text.secondary` | `#475569` | Teks keterangan jadwal, nama asisten, label form. |
| `text.muted` | `#94A3B8` | Teks placeholder input, teks keterangan dinonaktifkan. |
| `text.inverse` | `#FFFFFF` | Teks di atas tombol primer atau badge solid. |

#### B. Warna Semantik Status Sesi & Umpan Balik (Semantic State Colors)
Mengacu langsung pada kebutuhan SRS (Status Sesi & Validasi Presensi):

| Status / State | Background (`bg`) | Border (`border`) | Text (`text`) | Skenario Penggunaan |
| :--- | :--- | :--- | :--- | :--- |
| **DIBUKA / Success** | `#DCFCE7` | `#86EFAC` | `#15803D` | Badge sesi `DIBUKA`, modal presensi sukses, badge status kehadiran "Hadir". |
| **TERJADWAL / Warning**| `#FEF3C7` | `#FDE68A` | `#B45309` | Badge sesi `TERJADWAL` (menunggu dimulai). |
| **SELESAI / Danger** | `#FEE2E2` | `#FCA5A5` | `#B91C1C` | Badge sesi `SELESAI`, tombol Tutup Sesi, alert tolak presensi ganda. |
| **Neutral / Info** | `#F1F5F9` | `#E2E8F0` | `#475569` | Badge kelas (`IF-3A`), nomor meja lab, identitas sekunder. |
| **Disabled** | `#E2E8F0` | `#CBD5E1` | `#94A3B8` | Tombol presensi saat sesi terkunci, field terkunci. |

### 2.2 Tipografi (Typography)

Menggunakan font sistem bawaan (`Platform.select({ ios: 'System', android: 'Roboto' })`) untuk menjamin performa native dan kecepatan render:

| Token | Ukuran (Size) | Ketebalan (Weight) | Line Height | Penggunaan |
| :--- | :--- | :--- | :--- | :--- |
| `heading.xl` | 24 px | Bold (`700`) | 32 px | Header beranda nama aplikasi (*LabSync*). |
| `heading.lg` | 20 px | Semi-Bold (`600`) | 28 px | Judul kartu praktikum, judul modal konfirmasi. |
| `heading.md` | 16 px | Semi-Bold (`600`) | 24 px | Sub-judul bagian, nama mahasiswa di rekap. |
| `body.regular`| 14 px | Regular (`400`) | 20 px | Deskripsi jadwal, label form, isi teks modal. |
| `body.medium` | 14 px | Medium (`500`) | 20 px | Teks tombol aksi, label input field. |
| `caption.sm`  | 12 px | Medium (`500`) | 16 px | Badge status, stempel waktu check-in, meta-data. |
| `caption.xs`  | 11 px | Regular (`400`) | 14 px | Teks petunjuk bantuan (*hint text*). |

### 2.3 Skala Jarak & Ruang (Spacing & Layout Scale)

Gunakan sistem kelipatan 4 untuk ritme visual teratur:

| Token | Nilai | Implementasi |
| :--- | :--- | :--- |
| `space.xs` | 4 px | Jarak ikon dengan teks badge kecil. |
| `space.sm` | 8 px | Gap antar item berdekatan, padding badge. |
| `space.md` | 12 px | Jarak antar baris meta data dalam kartu praktikum. |
| `space.lg` | 16 px | Padding standar layar (*Screen padding*), margin kartu ke tepi. |
| `space.xl` | 20 px | Padding dalam kartu (*Card inner padding*), modal padding. |
| `space.2xl`| 24 px | Jarak antar seksi besar pada layar. |
| `space.3xl`| 32 px | Margin atas header atau tombol submit utama. |

### 2.4 Sudut & Elevasi (Border Radius & Shadows)

```typescript
export const Radii = {
  sm: 6,    // Input field, badge kecil
  md: 10,   // Tombol aksi, input box
  lg: 14,   // Kartu praktikum, kartu ringkasan
  xl: 20,   // Modal dialog, bottom sheet container
  full: 9999, // Pill switch role, avatar inisial
};

export const Shadows = {
  card: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2, // Android
  },
  modal: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8, // Android
  },
};
```

---

## 3. Tata Letak & Navigasi Mobile (Layout & Navigation)

### 3.1 Penanganan Area Aman (Safe Area & System Bar)
- Wajib menggunakan `SafeAreaView` dari `react-native-safe-area-context` dengan konfigurasi `edges={['top', 'left', 'right']}` pada container layar utama.
- Menetapkan `StatusBar` dengan prop `barStyle="dark-content"` dan warna background transparan pada Android.

### 3.2 Struktur Navigasi Berbasis Expo Router
Struktur rute terpetakan murni mengacu pada SRS:

```
src/app/
├── _layout.tsx           # Root provider, Safe Area, Stack navigator
├── index.tsx             # [Layar Utama]: Header, Role Switcher, Daftar Kartu Sesi
├── rekap/
│   └── [id].tsx          # [Layar Asisten]: Rekapitulasi Presensi Sesi Terpilih
└── history.tsx           # [Layar Praktikan]: Riwayat Presensi Pribadi
```

### 3.3 Struktur Anatomi Layar Utama (`index.tsx`)
1. **Top Bar Header**:
   - Nama aplikasi: **LabSync** (`heading.xl`, warna `primary.main`).
   - Indikator identitas aktif: Avatar inisial + nama profil aktif.
2. **Role & Identity Switcher Bar**:
   - Komponen segmented button berdampingan: `[ 👨‍🏫 Asisten ]` vs `[ 👨‍🎓 Praktikan ]`.
   - Sub-selector untuk memilih akun mahasiswa dummy jika peran Praktikan aktif.
3. **Scrollable Content Canvas**:
   - Teks instruksi peran (misal: *"Mode Asisten: Kelola pembukaan dan penutupan sesi"*).
   - Daftar Kartu Sesi Praktikum (`FlatList` atau `ScrollView`).
4. **Bottom Action / Sticky Control**:
   - Akses cepat menuju layar riwayat (khusus Praktikan) atau ringkasan lab.

### 3.4 Penanganan Papan Ketik (Keyboard Handling)
- Pada modal formulir presensi, gunakan `KeyboardAvoidingView` dengan prop:
  `behavior={Platform.OS === 'ios' ? 'padding' : undefined}`
- Bungkus form dengan `TouchableWithoutFeedback onPress={Keyboard.dismiss}` untuk menutup keyboard saat pengguna mengetuk di luar area input.

---

## 4. Spesifikasi Komponen Reusable (Reusable Components)

### 4.1 Status Badge (`StatusBadge.tsx`)
Komponen penting untuk mengomunikasikan status sesi praktikum secara tegas.

- **Props**: `status: 'TERJADWAL' | 'DIBUKA' | 'SELESAI'`
- **Spesifikasi Tampilan**:
  - `paddingVertical: 4`, `paddingHorizontal: 10`, `borderRadius: Radii.full`.
  - Icon penanda visual + Label teks `caption.sm` (Bold).
- **Pemetaan Visual**:
  - `TERJADWAL`: Icon `clock` / bulat kuning, background `#FEF3C7`, border `#FDE68A`, teks `#B45309`. Teks: *"TERJADWAL"*.
  - `DIBUKA`: Icon `play-circle` / titik hijau berkedip, background `#DCFCE7`, border `#86EFAC`, teks `#15803D`. Teks: *"DIBUKA (AKTIF)"*.
  - `SELESAI`: Icon `lock` / centang abu, background `#FEE2E2`, border `#FCA5A5`, teks `#B91C1C`. Teks: *"SELESAI (DITUTUP)"*.

### 4.2 Kartu Sesi Praktikum (`SessionCard.tsx` / `SessionPraktikanCard.tsx`)
Komponen penampil unit sesi praktikum.
- **Anatomi Kartu**:
  - **Baris Atas**: Nama Mata Kuliah (`heading.lg`) + `StatusBadge`.
  - **Baris Tengah (Meta Data)**:
    - Ruang Lab (misal: *"🏛️ Lab Rekayasa Perangkat Lunak"*).
    - Kelas & Waktu (misal: *"👥 IF-3A  •  ⏰ 08:00 - 10:00 WIB"*).
    - Nama Asisten (misal: *"👤 Asisten: Yudha Pratama"*).
  - **Baris Bawah (Area Aksi Kontekstual)**:
    - **Sisi Asisten**:
      - Jika `TERJADWAL`: Tombol primer "Buka Sesi Lab" (Warna Hijau/Biru).
      - Jika `DIBUKA`: Tombol bahaya "Tutup Sesi Lab" (Warna Merah) + Tombol sekunder "Lihat Rekap Presensi".
      - Jika `SELESAI`: Label statis "Sesi Telah Selesai" + Tombol sekunder "Lihat Rekap Presensi".
    - **Sisi Praktikan**:
      - Jika `DIBUKA` dan belum presensi: Tombol primer "Lakukan Presensi Sekarang".
      - Jika `DIBUKA` dan sudah presensi: Tombol non-aktif berlabel "✓ Anda Sudah Presensi" (Warna Hijau Pastel).
      - Jika `TERJADWAL`: Tombol non-aktif berlabel "Menunggu Sesi Dibuka Asisten".
      - Jika `SELESAI`: Tombol non-aktif berlabel "Sesi Telah Berakhir".

### 4.3 Tombol Aksi (`Button.tsx`)
- **Varian**:
  - `primary`: Background `#2563EB`, teks `#FFFFFF`.
  - `success`: Background `#16A34A`, teks `#FFFFFF` (untuk Buka Sesi).
  - `danger`: Background `#DC2626`, teks `#FFFFFF` (untuk Tutup Sesi).
  - `secondary` / `outline`: Background transparan, border `1.5px #CBD5E1`, teks `#0F172A`.
- **Ukuran**:
  - `height: 48` (memenuhi standar aksesibilitas touch target ≥ 44dp).
  - `borderRadius: Radii.md`.
  - `alignItems: 'center'`, `justifyContent: 'center'`.
- **States**:
  - Pressed: `opacity: 0.8`.
  - Disabled: Background `#E2E8F0`, teks `#94A3B8`, border `#E2E8F0`.

### 4.4 Form Input Field (`Input.tsx`)
- Container: `height: 48`, border `1px solid #E2E8F0`, `borderRadius: Radii.sm`, background `#FFFFFF`.
- State Fokus: Border `1.5px solid #2563EB`, background `#FFFFFF`.
- State Error: Border `1.5px solid #EF4444`.
- Padding horizontal: 14 px. Teks input ukuran 14 px.

### 4.5 Dialog Modal Konfirmasi (`ConfirmationModal.tsx`)
Digunakan untuk aksi kritis asisten (Buka & Tutup Sesi).
- **Backdrop**: Layar penuh semi-transparan `rgba(15, 23, 42, 0.6)`.
- **Card Modal**: Tengah layar, lebar 88%, background `#FFFFFF`, `borderRadius: Radii.xl`, padding 20 px.
- **Elemen**:
  - Ikon peringatan/konfirmasi di bagian atas.
  - Judul Konfirmasi (`heading.lg`).
  - Teks penjelasan dampak aksi (`body.regular`, warna `text.secondary`).
  - Dua tombol aksi di baris bawah: Tombol "Batal" (outline) dan Tombol "Ya, Lanjutkan" (solid).

### 4.6 Modal Umpan Balik Presensi Sukses (`AttendanceFeedbackModal.tsx`)
- Menampilkan ilustrasi/ikon centang besar warna hijau.
- Judul: *"Presensi Berhasil Dicatat!"*.
- Kotak ringkasan abu-abu memuat:
  - Nama Mahasiswa & NIM.
  - Sesi Praktikum.
  - Jam Presensi (contoh: `08:15:22 WIB`).
  - Catatan / Nomor PC yang diinput.
- Tombol tunggal lebar penuh: *"Selesai & Tutup"*.

### 4.7 Penanganan Data Kosong (`EmptyState.tsx`)
Wajib ditampilkan saat daftar tidak memiliki item.
- **Anatomi**:
  - Ikon visual berukuran 48x48 dp (warna `#94A3B8`).
  - Judul Kondisi Kosong (`heading.md`, teks gelap).
  - Deskripsi instruktif (`body.regular`, teks abu-abu).
- **Contoh Kasus**:
  - Rekap Asisten kosong: *"Belum Ada Praktikan Hadir. Presensi akan muncul seketika setelah praktikan mengirim data kehadiran."*
  - Jadwal kosong: *"Tidak Ada Jadwal Praktikum Hari Ini."*

---

## 5. Pola Interaksi (Interaction Patterns)

### 5.1 Standar Target Sentuh (*Touch Target*)
- Seluruh area interaktif (tombol, chip role switcher, ikon tombol kembali) memiliki area ketuk minimal **44 x 44 density-independent pixels (dp)**.
- Jika ikon berukuran 20px, bungkus menggunakan `Pressable` dengan padding minimal 12px.

### 5.2 Pencegahan Presensi Ganda (*Anti-Double Submit Protection*)
1. **Debounce / Disable on Click**: Saat tombol "Kirim Presensi" ditekan, tombol langsung memasuki status *loading/disabled* untuk mencegah *double tap*.
2. **Validasi State Lokal**: Sistem memeriksa apakah `studentId` telah ada pada list presensi sesi tersebut.
3. **Alert Penolakan Ramah**: Jika sudah terdaftar, modal feedback peringatan muncul dengan teks:
   > *"Anda sudah melakukan presensi pada sesi ini sebelumnya pada pukul [Jam Presensi]."*

### 5.3 Konfirmasi Tindakan Kritis Asisten
- Aksi "Buka Sesi" dan "Tutup Sesi" **dilarang langsung mengubah state tanpa konfirmasi**.
- Alur wajib: `Ketuk Tombol -> Tampil Modal Konfirmasi -> Ketuk "Ya, Lanjutkan" -> State Berubah -> Feedback Tampil`.

---

## 6. Aksesibilitas (Accessibility Standards)

1. **Kontras Warna (WCAG 2.1 AA)**:
   - Teks `#0F172A` pada background putih `#FFFFFF` memiliki kontras 15:1 (Melebihi standar minimum 4.5:1).
   - Teks status hijau `#15803D` pada `#DCFCE7` memiliki rasio kontras 5.2:1.
2. **Accessible Labels**:
   - Seluruh komponen `Pressable` atau icon-only button wajib menyertakan prop `accessibilityLabel` dan `accessibilityRole="button"`.
3. **Dukungan Text Scaling**:
   - Komponen teks tidak boleh menggunakan batasan tinggi kaku (*fixed height*) pada container yang dapat menyebabkan teks terpotong saat pengguna memperbesar ukuran font sistem (*System Font Scaling*).
4. **Indikator Non-Warna**:
   - Status sesi tidak hanya dibedakan lewat warna hijau/kuning/merah, melainkan juga didukung oleh teks label tertulis dan ikon yang berbeda.

---

## 7. Panduan Konten & Teks Antarmuka (Microcopy)

Gunakan Bahasa Indonesia yang baku, ramah, dan berorientasi tindakan:

| Konteks | Teks yang Dianjurkan | Teks yang Dihindari |
| :--- | :--- | :--- |
| **Buka Sesi (Asisten)** | "Buka Sesi Praktikum" | "Open" / "Aktifkan" |
| **Tutup Sesi (Asisten)**| "Tutup Sesi Praktikum" | "End" / "Matikan" |
| **Presensi (Praktikan)**| "Lakukan Presensi" | "Submit Absen" / "Klik Di Sini" |
| **Konfirmasi Buka** | "Apakah Anda yakin ingin membuka sesi ini? Praktikan akan dapat melakukan presensi." | "Yakin buka?" |
| **Konfirmasi Tutup** | "Apakah Anda yakin ingin menutup sesi ini? Presensi baru tidak dapat dilakukan lagi setelah sesi ditutup." | "Tutup sekarang?" |
| **Pencegahan Ganda** | "Presensi Ditolak: Anda sudah tercatat hadir pada sesi praktikum ini." | "Error 400: Duplicate Entry" |
| **Empty State Rekap** | "Belum ada praktikan yang melakukan presensi pada sesi ini." | "Data Kosong" |

---

## 8. Standar Implementasi React Native & Expo SDK 58

1. **Styling Pure StyleSheet**:
   - Seluruh styling wajib menggunakan `StyleSheet.create()`.
   - Hindari inline style objek baru pada render function karena memicu alokasi memori berulang pada setiap siklus re-render.
2. **Pemisahan Logika & Presentasi (*Separation of Concerns*)**:
   - Komponen antarmuka (misal: `SessionCard`, `StatusBadge`, `ConfirmationModal`) harus bersifat *stateless* atau menerima props & callback dari parent.
   - Hindari penulisan logika mutasi state global di dalam atom komponen.
3. **Kompatibilitas Dependensi**:
   - Jangan menambahkan library styling eksternal baru (seperti Tailwind/NativeWind, Tamagui) jika belum disetujui. Gunakan `StyleSheet` dan Flexbox native yang sudah ada.
4. **Performa List**:
   - Untuk daftar jadwal dan daftar rekap presensi, utamakan penggunaan `FlatList` dengan properti `keyExtractor={(item) => item.id}` untuk efisiensi render memori.

---

## 9. Aturan Khusus Coding Agent (Rules for Agentic Coding)

Seluruh Coding Agent (AI maupun developer) yang akan mengimplementasikan kode antarmuka **wajib mematuhi 10 aturan berikut**:

1. **Wajib Membaca SRS**: Pahami kebutuhan fitur, aktor (`ASISTEN` / `PRAKTISAN`), dan business rules pada `docs/srs.md` sebelum membuat atau memodifikasi layar.
2. **Patuhi Design Tokens**: Wajib menggunakan token warna, tipografi, dan spasi yang tertera pada dokumen `design.md` ini. Dilarang menggunakan warna acak (*arbitrary hex colors*).
3. **Gunakan Kembali Komponen (*Reusability First*)**: Periksa folder `src/components/common/` sebelum membuat komponen baru. Gunakan `StatusBadge`, `ConfirmationModal`, dan `EmptyState` yang sudah distandardisasi.
4. **Jangan Mengarang Fitur/Role Baru**: Tidak boleh menambahkan peran baru (seperti Admin/Dosen) atau status baru selain `TERJADWAL`, `DIBUKA`, `SELESAI`.
5. **Implementasikan Seluruh State**: Layar tidak boleh hanya menampilkan kondisi ideal (*happy path*). Wajib menangani kondisi: data kosong (*empty state*), tombol dinonaktifkan (*disabled state*), dan konfirmasi sebelum mutasi data.
6. **Tombol Harus Memiliki Aksi Nyata**: Dilarang meletakkan tombol dummy tanpa event handler `onPress`. Minimal berikan pemicu modal konfirmasi atau umpan balik.
7. **Perlindungan Tata Letak Mobile**: Wajib menyertakan `SafeAreaView` dan `KeyboardAvoidingView` pada form formulir.
8. **Low-Dependency Discipline**: Patuhi pembagian file ownership pada `docs/programmer.md`. Jangan mengedit file milik programmer lain tanpa koordinasi.
9. **Kepatuhan TypeCheck**: Kode harus selalu valid TypeScript tanpa menyisakan error (`npx tsc --noEmit`).
10. **Tandai Blocker Jika Ambigius**: Jika menemukan instruksi yang ambigu atau bertentangan, tandai sebagai *question/blocker* kepada Project Manager dan jangan membuat asumsi sepihak.

---

## 10. Checklist Definisi Selesai (Definition of Done UI)

Gunakan checklist ini sebelum menyatakan implementasi suatu komponen atau layar telah tuntas:

- [ ] **Kesesuaian Fungsional**: Mengacu dan memenuhi Acceptance Criteria pada `docs/srs.md`.
- [ ] **Kepatuhan Token**: Seluruh warna, padding, font size, dan border radius menggunakan token dari `design.md`.
- [ ] **Hierarki Peran**: Komponen kontrol sesi hanya tampil untuk Asisten; tombol presensi hanya aktif untuk Praktikan saat sesi `DIBUKA`.
- [ ] **Responsif & Aman**: Tidak ada teks atau kartu yang terpotong (*no clipping/overflow*) pada layar mobile 360dp+.
- [ ] **Penanganan Status Lengkap**:
  - [ ] Kondisi Sesi `TERJADWAL` tertangani dengan benar.
  - [ ] Kondisi Sesi `DIBUKA` tertangani dengan benar.
  - [ ] Kondisi Sesi `SELESAI` tertangani dengan benar.
  - [ ] Kondisi data kosong (*Empty State*) menampilkan pesan instruktif.
- [ ] **Validasi Interaksi**:
  - [ ] Dialog konfirmasi muncul sebelum Buka Sesi dan Tutup Sesi.
  - [ ] Validasi anti-presensi ganda bekerja dan memunculkan pesan peringatan.
  - [ ] Modal sukses presensi menampilkan jam kehadiran akurat.
- [ ] **Aksesibilitas**: Target ketuk tombol minimal 44x44 dp dan teks memiliki kontras yang terbaca jelas.
- [ ] **Kualitas Kode**: Bersih dari error TypeScript (`npx tsc --noEmit`) dan bebas peringatan linting.
