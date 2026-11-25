# Sprint 4

Pada sprint ini, kembangkan aplikasi **React Native** dengan menyempurnakan manajemen laboratorium, pengelolaan kegiatan praktikum, serta mengintegrasikan sistem denda dan pembayaran menggunakan **Midtrans**. Lakukan pula finalisasi antarmuka agar aplikasi memiliki tampilan yang modern, konsisten, dan mudah digunakan oleh seluruh peran pengguna.

---

## Kebutuhan yang Harus Dipenuhi

### 1. Manajemen Laboratorium oleh Aslab *(Role Baru)*
Asisten laboratorium (Aslab) memiliki kewenangan untuk mengelola laboratorium dan distribusi praktikan sesuai mata kuliah yang menjadi tanggung jawabnya.

**Fitur yang harus tersedia:**
- Menambahkan dan mengelola data laboratorium.
- Melakukan *bulk* / *single insert* untuk membuat sejumlah laboratorium sekaligus berdasarkan satu mata kuliah.
- Melakukan *bulk* / *single insert* data praktikan ke laboratorium tertentu.
- Melakukan *bulk* / *single insert* data asprak ke laboratorium tertentu.
- Memindahkan praktikan dari satu laboratorium ke laboratorium lainnya.
- Mengelola informasi laboratorium, termasuk nama, lokasi, koordinat, dan radius validasi presensi.
- Menyediakan *downloadable file template insert* untuk opsi fitur *bulk insert*.
- Mengatur cakupan lokasi presensi.
- Mengatur batasan keterlambatan waktu.

> **Catatan Implementasi:**
> - Ketiga fitur *bulk insert* di atas harus **dipisah**, bukan menjadi satu *bulk insert* yang mencakup ketiganya.
> - Tidak perlu ada perpindahan jadwal praktikum; cukup perpindahan praktikan dan aslab-nya saja.
> - Untuk *bulk insert*, setiap baris (*row*) data akan diubah menjadi daftar data dalam bentuk *scroll view* yang dapat diatur secara fleksibel oleh Aslab (*accept* / *deny*, memperbarui dan mengisi data yang masih kosong, dsb.).

---

### 2. Dashboard Keberlangsungan Laboratorium
Aslab memiliki dashboard untuk memantau kegiatan praktikum pada seluruh laboratorium yang dikelola.

**Informasi yang setidaknya harus ditampilkan:**
- Jumlah laboratorium dan praktikan.
- Status kegiatan praktikum pada setiap laboratorium.
- Informasi lokasi dan waktu pelaksanaan.
- Jadwal praktikum yang sedang berlangsung maupun yang akan datang.
- Riwayat kegiatan laboratorium.
- Riwayat keuangan hasil dari denda praktikum.

> **Ketentuan:** Sediakan filter berdasarkan **hari, minggu, dan bulan** agar Aslab dapat memantau keberlangsungan kegiatan secara lebih terstruktur. Informasi dashboard harus memanfaatkan data jadwal dan sesi yang tersimpan di **Firebase**.

---

### 3. Pengelolaan Sesi oleh Asprak
Asprak difokuskan pada pengelolaan pelaksanaan praktikum di kelas atau laboratorium yang menjadi tanggung jawabnya.

**Fitur yang harus tersedia:**
- Melihat daftar kelas, jadwal, dan sesi praktikum yang menjadi tanggung jawabnya.
- Membuka sesi ketika kegiatan praktikum dimulai.
- Memantau & mengelola presensi praktikan.
- Menutup sesi setelah kegiatan praktikum selesai.

> **Ketentuan:** Perubahan status sesi harus tersinkronisasi secara *real-time* dengan aplikasi praktikan. Asprak **tidak memiliki kewenangan** untuk mengelola distribusi praktikan maupun konfigurasi seluruh laboratorium.

---

### 4. Perhitungan Keterlambatan dan Pengelolaan Denda
Sistem harus dapat menentukan keterlambatan berdasarkan waktu presensi praktikan dan waktu mulai sesi praktikum.

Gunakan mekanisme ***grace period*** sebagai batas toleransi keterlambatan:
- Praktikan yang melakukan presensi **sebelum atau tepat pada akhir masa toleransi** dianggap **tepat waktu**.
- Praktikan yang melakukan presensi **setelah melewati batas tersebut** dinyatakan **terlambat**.

**Ketentuan yang harus diterapkan:**
- Durasi toleransi dapat dikonfigurasi sesuai kebijakan praktikum.
- Denda menggunakan nominal tetap untuk setiap kejadian keterlambatan.
- Setiap kejadian keterlambatan hanya boleh menghasilkan satu tagihan.
- Tagihan harus terhubung dengan identitas praktikan, sesi, dan catatan presensi terkait.
- Pembayaran denda tidak mengubah status kehadiran praktikan.

> **Kebijakan Izin:** Praktikan yang memperoleh persetujuan izin dari Asprak tetap dicatat sebagai tidak hadir dengan izin (*excused absence*) dan dibebaskan dari denda keterlambatan. Keputusan izin tidak boleh mengubah catatan kehadiran menjadi hadir.

---

### 5. Integrasi Payment Gateway
Integrasikan aplikasi dengan **Midtrans** (boleh lainnya juga) menggunakan lingkungan **Sandbox** (sehingga tidak perlu menggunakan uang asli) untuk menangani pembayaran denda praktikum.

**Fitur yang harus tersedia:**
- Menampilkan daftar tagihan dan rincian nominal denda.
- Membuat transaksi pembayaran melalui *backend*.
- Mengarahkan praktikan ke halaman atau metode pembayaran yang disediakan *Payment Gateway*.
- Menangani respons transaksi dan *callback*/*webhook* dari *Payment Gateway*.
- Menampilkan status pembayaran berupa `pending`, `success`, atau `failed`.
- Memperbarui status tagihan berdasarkan hasil verifikasi pembayaran.
- Menyediakan riwayat transaksi dan pembayaran praktikan.

> **Keamanan & Arsitektur:** Seluruh proses transaksi harus mengikuti alur **`client` – `server` – `payment gateway`**. Informasi sensitif seperti *secret key* tidak boleh disimpan di aplikasi React Native. Status pembayaran tidak boleh ditentukan hanya berdasarkan respons dari sisi *client*, tetapi harus diverifikasi melalui *backend* menggunakan *callback*/*webhook* yang valid.

---

### 6. Notifikasi dan Riwayat Pembayaran
Integrasikan proses pembayaran dengan sistem notifikasi yang telah dikembangkan pada sprint sebelumnya.

**Praktikan harus memperoleh pemberitahuan ketika:**
- Tagihan denda baru dibuat.
- Pembayaran berhasil.
- Pembayaran gagal atau membutuhkan penyelesaian lebih lanjut.

> **Ketentuan Riwayat:** Sediakan halaman riwayat pembayaran yang menampilkan informasi **sesi, tanggal tagihan, nominal, waktu transaksi, dan status pembayaran**. Riwayat pembayaran harus tetap tersedia meskipun aplikasi ditutup dan dibuka kembali.

---

### 7. Integrasi AI dan Pengelolaan Pengajuan Izin
Sempurnakan fitur pengajuan izin dan integrasi *Artificial Intelligence* (AI) yang telah dikembangkan pada Sprint 2 dengan menyesuaikannya terhadap pengelolaan laboratorium, sesi praktikum, presensi, dan sistem denda.

**Fitur yang harus tersedia:**
- Praktikan dapat mengajukan izin pada sesi praktikum tertentu dengan menyertakan alasan ketidakhadiran.
- Melakukan analisis sentimen terhadap alasan pengajuan izin menggunakan API model AI yang disediakan pengajar.
- Menyimpan hasil analisis AI bersama data pengajuan izin di **Cloud Firestore**.
- Asprak dapat melihat alasan pengajuan izin beserta hasil analisis AI dari praktikan yang menjadi tanggung jawabnya.
- Asprak dapat menerima atau menolak pengajuan izin.
- Praktikan dapat memantau status pengajuan izin secara *real-time*.
- Menangani kondisi ketika layanan AI mengalami gangguan atau tidak memberikan respons tanpa menghambat proses pengajuan dan pemeriksaan izin.

> **Catatan Penting:**
> - Hasil analisis AI hanya digunakan sebagai informasi pendukung bagi Asprak dalam melakukan pemeriksaan pengajuan izin, **bukan** sebagai dasar pengambilan keputusan secara otomatis.
> - Pengajuan izin yang disetujui harus terintegrasi dengan sistem presensi dan pengelolaan denda sesuai ketentuan pada sprint ini. Praktikan tetap dicatat sebagai tidak hadir dengan izin (*excused absence*) dan dibebaskan dari denda keterlambatan.