
# Notifikasi Android · Y-05–09

Cloud Functions `notifications` memakai Node 22 di `asia-southeast2`. Trigger update menulis event sekali per sumber/tipe/revisi. Untuk pembukaan sesi lama tanpa revisi, ID trigger Firestore yang stabil dipakai. Perubahan jadwal memakai `scheduleRevision` dari Daniel. Perubahan klasifikasi dan metadata tidak membuat push.

Worker terjadwal membaca kandidat dari indeks perangkat aktif secara bertahap. Untuk tiap calon penerima sesi, worker membaca path enrollment asli `enrollments/{uid}/classes/{classId}`. Ini juga mencakup enrollment lama yang hanya menyimpan `enrolledAt`. Worker memeriksa lagi enrollment, pemilik token dan masa ikat perangkat sebelum mengirim. Keputusan izin hanya ditujukan ke pemilik request. Payload push membawa event, tipe dan ID sesi; server menyelesaikan tujuan tap setelah login dan cek akses. Retry maksimal lima percobaan per delivery. FCM dan pencatatan hasil tidak atomik; tag Android dan dedupe di aplikasi mengurangi duplikat.

## Setup dev bersama PM

1. Pakai project Firebase dev yang disepakati. Deploy Functions memerlukan billing Blaze, FCM API aktif dan runtime service account dengan akses Firestore dan izin kirim FCM. Cloud Functions memakai credential runtime; isi Admin key tidak perlu masuk app native.
2. Tetapkan package Android, daftarkan app Android di Firebase yang sama dan masukkan `LABSYNC_ANDROID_PACKAGE` serta `LABSYNC_ANDROID_GOOGLE_SERVICES_FILE` dari .env.sprint3.example ke konfigurasi development build. Atur Google Maps key bersama PM bila peta native ikut diuji.
3. Deploy rules dan codebase dengan target yang eksplisit setelah disetujui PM, lalu install development build Android yang sesuai. Dari app, pilih **Coba aktifkan notifikasi** dan izinkan notifikasi Android.
4. Uji keempat event dengan praktikan dari dua kelas, lalu ulangi saat app aktif, background dan dibuka dari tap setelah proses ditutup. Cabut enrollment atau ganti akun sebelum tap untuk memeriksa pembatasan tujuan. Catat status umum dan event ID tanpa token.

Browser dan Expo Go tidak mendaftarkan token FCM. Adapter iOS menunggu keputusan demo dan konfigurasi APNs. Saat perangkat offline ketika logout, pencabutan server bisa tertunda; aplikasi membersihkan notifikasi lokal dan server memeriksa hak akses lagi pada tap. Bukti penerimaan FCM perlu device fisik/development build dan konfigurasi Firebase Android.

Jalankan `npm --prefix functions ci` lalu `npm --prefix functions test`. Untuk menjalankan tes Firestore outbox lokal, pakai `npx firebase-tools emulators:exec --only firestore --project demo-labsync "npm --prefix functions test"`.
