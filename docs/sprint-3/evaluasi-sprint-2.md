# Evaluasi Sprint 2 dan tindak lanjut Sprint 3

Catatan tim · 19 November 2026 · PM Muhammad Hafidh Zufar Dewantara (Zufar)

## Poin evaluasi

| No. | Masukan | Pengingat untuk tim |
| --- | --- | --- |
| 1 | Build aplikasi dan demo lewat panggilan video | Siapkan build yang bisa dipasang di perangkat demo. Tunjukkan alur asisten dan praktikan melalui Teams atau video call. |
| 2 | UID praktikan seharusnya memakai NIM | Catat NIM sebagai identitas praktikan yang perlu diverifikasi. Saat review, pastikan apakah masukan ini merujuk pada ID yang dipakai pengguna dan rekap, atau pada UID Firebase Auth. Jika UID Auth yang dimaksud, tinjau dampaknya pada akun, enrollment, presensi, izin, dan aturan akses sebelum mengubahnya. |
| 3 | Nama sesi praktikum rancu | Tambahkan keterangan yang membantu pengguna membedakan sesi, misalnya nama praktikum, kelas, pertemuan, dan waktu. Periksa apakah informasi cukup jelas dari kartu jadwal hingga halaman presensi. |
| 4 | UI masih perlu dirapikan | Zufar merapikan hierarki informasi, konsistensi komponen, dan tampilan lintas layar setelah fitur programmer terintegrasi. |
| 5 | Rute terlalu jauh | Konfirmasi rute yang dimaksud pada review berikutnya. Jika terkait navigasi aplikasi, periksa jumlah langkah dari jadwal atau detail sesi ke presensi dan persingkat langkah yang tidak diperlukan. |
| 6 | Validasi waktu memakai waktu server | Pada alur presensi, gunakan waktu server untuk memeriksa kedaluwarsa QR dan mencatat waktu kehadiran. Uji dengan jam perangkat yang berbeda. Waktu yang ditampilkan ke pengguna mengikuti Asia/Jakarta. |
| 7 | Penambahan asprak masih manual lewat database | Pertimbangkan alur pengelolaan asprak oleh Superadmin. Bahas siapa yang boleh memberi atau mencabut akses asprak dan bagaimana perubahan tersebut dicatat. Superadmin masih berupa opsi yang perlu disepakati. |

Gunakan [SRS Sprint 3](README.md) untuk menentukan pekerjaan tiap programmer. Masukan yang masih perlu keputusan, terutama perubahan UID Auth dan penambahan Superadmin, dibahas sebelum dimasukkan ke scope fitur.

## Strategi commit fitur dan overhaul UI

1. **Daniel, Agiel, dan Yudha mengerjakan SRS masing-masing.** Buat commit sesuai cakupan fitur dan cantumkan ID SRS di commit atau PR agar kontribusi setiap programmer bisa ditelusuri. Sertakan perubahan layar dan navigasi yang diperlukan agar fitur dapat diuji.
2. **Integrasikan dan uji fitur lebih dulu.** Zufar meninjau hasil tiap PR. Catat perubahan tampilan lintas fitur untuk tahap UI akhir supaya programmer bisa menyelesaikan fitur sesuai pembagian.
3. **Zufar mengerjakan overhaul UI di akhir.** Setelah fitur Sprint 3 terintegrasi, Zufar membuat satu commit UI terpisah dari commit fitur, misalnya `style(ui): overhaul tampilan LabSync Sprint 3`. PR UI mencantumkan layar yang berubah dan bukti sebelum/sesudah. Perubahan kontrak atau logika fitur dicatat bersama pemilik SRS di commit tersendiri.
4. **Uji ulang alur utama setelah overhaul.** Cek presensi QR dan lokasi sampai rekap, Maps dan aktivitas lab, serta penerimaan dan navigasi dari notifikasi. Gunakan build perangkat untuk latihan demo.
