# Kontrak bersama Sprint 3

Versi 1.0. Kontrak ini adalah target implementasi, bukan endpoint/database yang sudah tersedia. `src/types/sprint3.ts` menampung bentuk data baru secara terpisah dari Sprint 2. Perubahan kontrak harus direview PM dan programmer konsumennya.

## Kompatibilitas

Tetap gunakan `users/{uid}`, `classes/{classId}.assistantUid`, `enrollments/{uid}/classes/{classId}`, `sessions`, `attendance`, `leaveRequests`. Jangan mengganti enum `PRAKTISAN` meski label UI adalah Praktikan. Status sesi tetap `TERJADWAL → DIBUKA → SELESAI`. ID attendance/izin tetap `${sessionId}__${uid}`. Riwayat/review lama tidak dihapus atau diubah identitasnya.

Database target menurut konfigurasi repo adalah `(default)` proyek `labsync-sprint2-dev`. Pemeriksaan metadata cloud pada persiapan ini gagal karena sesi CLI Firebase belum terautentikasi; edition database belum diverifikasi. Sebelum menulis migrasi/indeks/deploy, operator harus memeriksa instance yang sama, bukan membuat database/proyek baru. Skema di bawah mengikuti pola dokumen yang sudah ada pada repo dan tidak memerlukan provisioning pada branch fondasi.

## Data target

| Path | Field baru/kontrak | Penulis dan pembaca |
| --- | --- | --- |
| `labs/{labId}` | `name`, `coordinates: {latitude, longitude} \| null`, `enabled`, `configVersion` | Operator tepercaya menulis koordinat resmi; pengguna login membaca master lab |
| `sessions/{id}` | Tambahkan `labId`, `radiusMeters`, `scheduleRevision`, `startsAt`, `endsAt` dan `attendanceConfig` saat dibuka | Asisten pemilik lewat API/validasi; peserta kelas dan asisten pemilik membaca |
| `sessions/{id}.attendanceConfig` | Snapshot `labId`, koordinat, `labConfigVersion`, radius, `policyVersion` | Server membuat sebelum/saat membuka; immutable selama dibuka; koordinat master berubah tidak menggeser radius sesi aktif |
| `attendanceChallenges/{challengeId}` | `sessionId`, `tokenHash`, `createdAt`, `expiresAt`, status aktif/dicabut | Server saja; jangan izinkan client membaca hash/token koleksi ini |
| `attendance/{sessionId}__{uid}` | Field Sprint 2 dipertahankan; tambahan `verification` berisi method `qr-geotag`, labId/version, jarak, radius, lokasi/akurasi/usia saat diverifikasi, challengeId/policyVersion | Hanya server menulis; peserta melihat sendiri, asisten pemilik melihat rekap; UI umum tidak menampilkan koordinat presisi |
| `labActivities/{sessionId}` | `sessionId`, `labId`, `courseName`, `className`, `startsAt`, `endsAt`, status, `scheduleRevision` | Proyeksi server; pengguna login membaca; tidak memuat UID, daftar peserta, alasan izin |
| `deviceRegistrations/{installationId}` | `ownerUid`, `platform`, `transport: fcm`, token, `updatedAt`, `enabled` | Registrasi/revoke melalui API dengan UID dari Auth; server membaca; client lain tidak dapat membaca/menulis token |
| `notificationEvents/{eventId}` dan subkoleksi delivery | type, sourceId/revision, recipientUid, status/attempt/lastError, lease/nextAttempt | Server-only; dedupe event dan pengiriman per perangkat; jangan simpan raw token pada log error |

`startsAt`/`endsAt` adalah Firestore Timestamp yang konsisten dengan `date`, `startTime`, `endTime` Sprint 2 dalam Asia/Jakarta. Dokumen tanpa field baru tidak dipaksa menjadi sesi siap geotag. Isi lewat migrasi tervalidasi oleh Daniel; pembukaan/presensi baru ditolak sampai lengkap. Saat jadwal/status berubah, proyeksi ikut diperbarui; dokumen proyeksi dihapus atau ditandai selesai bila sumber dihapus. Trigger/proyeksi harus menangani event tidak berurutan berdasarkan revision terbaru.

Radius dipilih asisten per sesi, tidak mengambil radius diam-diam dari client. Nilai awal teknis di `config/sprint3-policy.json`: QR 60 detik, usia fix maksimum 30 detik, akurasi maksimum 30 meter dan toleransi waktu pengukuran di masa depan 5 detik. Ini usulan awal pengembangan, bukan hasil pengukuran lab atau keputusan perangkat dari user. PM mengevaluasinya saat uji lapangan; GPS dalam gedung bisa tidak cukup akurat untuk membedakan ruang berdekatan. Nilai `null`, bila dipakai saat revisi, berarti belum dikonfigurasi dan harus ditolak server. Kebijakan tidak dapat ditimpa body permintaan.

## API target dan payload

Semua endpoint memerlukan `Authorization: Bearer <Firebase ID token>`, HTTPS pada server bersama, verifikasi token server, pembatasan ukuran input dan rate limit sesuai penggunaan. `uid`, NIM, kelas dan hak akses berasal dari data server. Endpoint yang belum diimplementasikan tidak dibuat sebagai stub yang mengembalikan sukses.

### `POST /api/attendance/challenges`

Body `{ sessionId }`. Hanya asisten pemilik sesi terbuka dan terkonfigurasi. Hasil berisi QR JSON `{ version: 1, sessionId, challengeId, token }` dan `expiresAt` ISO-8601. Gunakan token acak kriptografis dan hash server; jangan memakai sessionId saja sebagai rahasia. QR adalah tantangan bersama untuk peserta sesi; pemindaian satu peserta tidak menghabiskan QR bagi peserta lain. Rotasi membatalkan tantangan lama sesuai kebijakan yang diumumkan UI.

### `POST /api/attendance/check-in`

```json
{
  "sessionId": "session-id",
  "challengeId": "challenge-id",
  "token": "opaque-token-from-qr",
  "location": {
    "latitude": -6.0,
    "longitude": 110.0,
    "accuracyMeters": 12,
    "capturedAtMs": 1790000000000
  },
  "notes": "PC-14"
}
```

**Angka di contoh payload hanya ilustrasi format, bukan koordinat LAB AP/B/C/D atau nilai kebijakan yang disepakati.** Gunakan lokasi perangkat asli saat pengiriman. Catatan opsional mengikuti batas Sprint 2 atau batas baru yang didokumentasikan Daniel.

Hasil sukses HTTP 200: `{ status: 'recorded' | 'already-recorded', attendanceId, checkedInAt: ISO-string, distanceMeters, radiusMeters }`. Server mengecek identitas/enrollment dahulu, lalu boleh mengembalikan rekaman sendiri yang telah tersimpan untuk retry meski sesi/QR kemudian berakhir. Tanpa rekaman, semua pemeriksaan harus lolos pada transaksi commit. Tidak mengembalikan detail presensi milik user lain.

Hasil error: `{ error: { code, message } }`, dengan kode stabil:

| HTTP | Kode | Tindakan UI |
| --- | --- | --- |
| 401 / 403 | `AUTH_REQUIRED` / `FORBIDDEN` | Login ulang / jelaskan tidak berhak |
| 404 | `SESSION_NOT_FOUND` | Kembali ke daftar sesi |
| 409 | `SESSION_CLOSED` | Perbarui status sesi |
| 409 | `LAB_NOT_CONFIGURED`, `POLICY_NOT_CONFIGURED` | Hubungi asisten/PM, jangan hadir otomatis |
| 400 | `QR_INVALID`, `LOCATION_INVALID` | Scan/ambil lokasi ulang |
| 409 | `QR_EXPIRED` | Scan QR terbaru |
| 422 | `LOCATION_STALE`, `LOCATION_INACCURATE`, `OUTSIDE_RADIUS` | Perbarui lokasi atau pindah ke lab |
| 429 / 503 | `RATE_LIMITED` / `SERVICE_UNAVAILABLE` | Retry dengan jeda; jangan menandai sukses |

Koneksi gagal di client ditampilkan sebagai kondisi jaringan, tidak perlu dipalsukan sebagai kode respons server. Respons API aktual harus sesuai tabel ini atau perubahan kontrak disepakati bersama.

## Aturan keamanan yang harus diimplementasikan

1. Direct-write attendance oleh client harus ditutup ketika endpoint baru siap. Pengecekan QR/GPS hanya pada komponen UI tidak memenuhi SRS.
2. Admin SDK melewati rules; setiap API dan trigger tetap wajib memeriksa identitas/ownership/enrollment sendiri. Input sessionId bukan bukti akses.
3. Sesi dibaca dalam transaksi yang menulis attendance sehingga penutupan sesi bersamaan tidak melewati validasi. ID deterministik mencegah dua commit; QR harus terikat sesi dan belum kedaluwarsa saat verifikasi.
4. Field koordinat/radius/policy/challenge dan hasil verifikasi tidak dapat ditimpa praktikan. Immutable snapshot sesi aktif dipakai sebagai acuan.
5. Token push dan challenge rahasia tidak dibuka pada query umum. Proyeksi Maps memuat metadata praktikum saja. Tidak ada service account/private key di Git atau `EXPO_PUBLIC_*`.
6. Validasi server terhadap GPS yang dilaporkan perangkat mengurangi bypass client, tetapi tidak membuktikan keberadaan fisik secara mutlak. Jangan mengklaim anti-fake-GPS total. Sepakati retensi data lokasi dengan PM sebelum memakai data mahasiswa riil.

## Kontrak event notifikasi

| Type | Kondisi sumber | Penerima |
| --- | --- | --- |
| `session.opened` | Status lama `TERJADWAL`, status baru `DIBUKA` | Praktikan enrollment kelas sumber |
| `schedule.changed` | Field jadwal materiil berubah dan scheduleRevision naik | Praktikan enrollment kelas sumber |
| `leave.approved` | Decision `pending → approved` | `studentUid` dari leaveRequest sumber |
| `leave.rejected` | Decision `pending → rejected` | `studentUid` dari leaveRequest sumber |

EventId mengikuti source/type/revision atau ID event Firestore yang stabil. Satu keputusan tidak dibuat ulang akibat classification berubah. Pembukaan sesi tidak membuat event schedule.changed tambahan. Payload push berisi `eventId`, `type`, `sessionId` dan `leaveRequestId` bila relevan. Penerima, token, title/body dan deep link disusun server, bukan diterima mentah dari client.

Pengiriman bersifat best effort. Dedupe trigger, retry per perangkat, token invalid, race logout/ganti akun dan eventual consistency harus diuji. Sukses Admin FCM berarti provider menerima permintaan; bukti perangkat diperlukan untuk menyatakan push diterima.

## Referensi implementasi

- [Expo SDK 58 Location](https://docs.expo.dev/versions/v58.0.0/sdk/location/), [Camera](https://docs.expo.dev/versions/v58.0.0/sdk/camera/), [Maps](https://docs.expo.dev/versions/v58.0.0/sdk/map-view/).
- [Expo SDK 58 Notifications](https://docs.expo.dev/versions/v58.0.0/sdk/notifications/) dan [token FCM/APNs](https://docs.expo.dev/push-notifications/sending-notifications-custom/).
- [Firestore triggers: pengiriman berulang dan urutan](https://firebase.google.com/docs/functions/firestore-events), [manajemen token FCM](https://firebase.google.com/docs/cloud-messaging/manage-tokens).

Referensi Medium dari soal dicatat sebagai materi tambahan: [push](https://medium.com/@silverskytechnology/rich-push-notifications-in-react-native-a-complete-guide-797dd9747366), [Maps](https://medium.com/@silverskytechnology/implementing-google-maps-and-routes-tracking-in-react-native-a-starter-guide-9768282594b8). API implementasi mengikuti dokumentasi resmi dan versi SDK repo.
