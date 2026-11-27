# Jobdesk Sprint 4 — Yudha (`SRS-4.4`, `SRS-4.5`, `SRS-4.6`)

> **Dokumen Hub:** [`srs.md`](./srs.md)  
> **Single Source of Truth:** [`kebutuhan_sprint_4.md`](../resource/kebutuhan_sprint_4.md) (Poin 4, 5, 6) & [`notes.md`](../resource/notes.md)  
> **Prasyarat Branching:** Mulai branching dari `main` **hanya setelah** `Commit 0` (`chore/s4-shared-foundation`) di-merge. Setelah itu pekerjaan Yudha **100% paralel** tanpa menunggu Daniel atau Zufar.

---

## 1. User Stories (Format Form)

```text
Yudha - SRS-4.4 : Sebagai sistem, saya dapat menghitung keterlambatan presensi berdasarkan grace period yang dikonfigurasi dan menghasilkan tepat satu tagihan denda nominal tetap per kejadian keterlambatan tanpa mengubah status kehadiran saat dibayar serta membebaskan denda bagi izin yang disetujui.
Yudha - SRS-4.5 : Sebagai Praktikan, saya dapat melihat tagihan denda dan membayarnya melalui Midtrans Sandbox dengan alur aman client-server-payment gateway yang status pembayarannya diverifikasi melalui webhook backend.
Yudha - SRS-4.6 : Sebagai Praktikan, saya dapat menerima notifikasi ketika tagihan denda baru dibuat, pembayaran berhasil, atau pembayaran gagal, serta melihat halaman riwayat pembayaran yang tersimpan persisten.
```

---

## 2. Lingkup Fitur & Ketentuan Wajib

### A. Perhitungan Keterlambatan & Engine Denda (`SRS-4.4`)
- **Validasi *Grace Period*** (memastikan konsistensi dengan `src/lib/attendance-rules.ts`):
  - `serverNow <= session.startsAt + session.lateAfterMin * 60_000` → **`HADIR`** (tepat waktu, tanpa tagihan denda).
  - `serverNow > session.startsAt + session.lateAfterMin * 60_000` → **`TERLAMBAT`** (membuat tagihan denda).
- **Aturan Pembuatan Denda (`src/lib/fine-rules.ts` & `src/data/actions-fine.ts`):**
  - Nominal denda tetap diambil dari `session.fineAmount ?? lab.defaultFineAmount ?? DEFAULT_FINE_AMOUNT` (misal `10000`).
  - **Tepat 1 tagihan per kejadian keterlambatan:** Gunakan ID deterministik `${sessionId}__${nim}` dan cek keberadaan tagihan sebelum membuat baru (idempotent).
  - Tagihan wajib menyimpan relasi: `nim`, `sessionId`, `classId`, `attendanceId` (`${sessionId}__${nim}`), `amount`, `status: 'unpaid'`, `createdAt`.
  - **Pembayaran tidak mengubah status kehadiran:** Saat tagihan menjadi `paid`, dokumen `attendance/{sessionId}__{nim}` **tetap `TERLAMBAT`** (tidak boleh berubah menjadi `HADIR`).
  - **Kebijakan Izin (*Excused Absence*):** Saat `reviewLeave` menyetujui izin (`decision === 'approved'`), hook `onLeaveApproved` memastikan:
    - Tidak ada tagihan denda aktif untuk sesi tersebut; jika sudah terlanjur ada tagihan berstatus `unpaid`, ubah menjadi `waived` dengan `waivedReason: 'Izin disetujui (excused absence)'`.
    - Status kehadiran tetap `IZIN`, tidak menjadi `HADIR`.

### B. Integrasi Payment Gateway Midtrans Sandbox (`SRS-4.5`)
- **Arsitektur Keamanan Wajib (`client -> server -> Midtrans Sandbox`):**
  - Gunakan environment server-only: `MIDTRANS_SERVER_KEY` dan `MIDTRANS_IS_PRODUCTION=false` (dokumentasikan di `.env.example`).
  - **DILARANG KERAS** menyimpan `MIDTRANS_SERVER_KEY` di aplikasi React Native atau menggunakan prefix `EXPO_PUBLIC_`.
  - **DILARANG KERAS** mengubah status tagihan menjadi `paid` / `success` hanya berdasarkan callback/redirect di client. Verifikasi wajib terjadi di server.
- **Endpoint Backend (Expo Server API Routes):**
  1. **`POST /api/payment/create`** (`src/app/api/payment/create+api.ts`):
     - Verifikasi `Authorization: Bearer <Firebase ID token>`.
     - Validasi bahwa `fineId` ada di Firestore, milik `uid` pemanggil, dan belum `paid` / `waived`.
     - Buat `orderId` unik, panggil Midtrans Snap Sandbox API (`https://app.sandbox.midtrans.com/snap/v1/transactions`) dengan Basic Auth `base64(MIDTRANS_SERVER_KEY + ':')`.
     - Simpan dokumen baru di koleksi `payments/{orderId}` (`status: 'pending'`, `snapToken`, `redirectUrl`) dan update `fines/{fineId}` (`status: 'pending'`, `latestOrderId: orderId`).
     - Kembalikan `{ orderId, snapToken, redirectUrl }` ke client.
  2. **`POST /api/payment/webhook`** (`src/app/api/payment/webhook+api.ts`):
     - Menerima HTTP notification dari Midtrans.
     - **Verifikasi Signature Wajib:** Hitung `SHA-512(order_id + status_code + gross_amount + MIDTRANS_SERVER_KEY)` dan bandingkan dengan `signature_key` payload secara constant-time (`crypto.timingSafeEqual`). Tolak dengan `403` jika tidak cocok.
     - Petakan `transaction_status` + `fraud_status` Midtrans ke 3 status baku Sprint 4:
       - `settlement` atau (`capture` & `fraud_status === 'accept'`) → **`success`** (update `fines/{fineId}.status = 'paid'`, `paidAt = now`; kirim notifikasi `PAYMENT_SUCCESS`).
       - `pending` → **`pending`** (update `fines/{fineId}.status = 'pending'`).
       - `deny`, `cancel`, `expire`, `failure` → **`failed`** (kembalikan `fines/{fineId}.status = 'unpaid'` agar praktikan dapat mencoba bayar ulang; kirim notifikasi `PAYMENT_FAILED`).
     - Proses webhook harus **idempotent** (tidak mengirim notifikasi ganda jika Midtrans me-retry webhook untuk status yang sama).
  3. **`GET /api/payment/status?orderId=...`** (`src/app/api/payment/status+api.ts`):
     - Fallback verifikasi server-to-server ke Midtrans Status API (`/v2/{orderId}/status`) untuk kondisi localhost/emulator saat webhook publik belum terjangkau, dengan aturan pemetaan & keamanan identik dengan webhook.
- **Alur UI Praktikan:**
  - `/denda`: Daftar tagihan denda milik praktikan + rincian nominal + status (`unpaid` / `pending` / `paid` / `waived`).
  - `/denda/[id]`: Detail tagihan (sesi, waktu presensi terlambat, nominal) + tombol **Bayar via Midtrans** yang memanggil `/api/payment/create`, lalu membuka `redirectUrl` memakai `expo-web-browser` atau `react-native-webview`, dan menampilkan status pembayaran real-time dari Firestore (`pending` / `success` / `failed`).

### C. Notifikasi & Riwayat Pembayaran Persisten (`SRS-4.6`)
- **Integrasi Notifikasi (`src/app/(app)/notifikasi.tsx` + Firestore `notifications`):**
  - Tambahkan pemetaan ikon & warna untuk `FINE_CREATED`, `PAYMENT_SUCCESS`, dan `PAYMENT_FAILED` di `src/app/(app)/notifikasi.tsx`.
  - Trigger pembuatan dokumen notifikasi di server:
    1. Saat denda dibuat (`onAttendanceRecorded` → `FINE_CREATED`, `href: '/denda/{fineId}'`).
    2. Saat pembayaran terverifikasi sukses (`webhook`/`status` → `PAYMENT_SUCCESS`, `href: '/denda/riwayat'`).
    3. Saat pembayaran gagal/kedaluwarsa (`webhook`/`status` → `PAYMENT_FAILED`, `href: '/denda/{fineId}'`).
- **Halaman Riwayat Pembayaran (`/denda/riwayat`):**
  - Menampilkan daftar transaksi pembayaran dari Firestore (`payments` + join metadata `fines` & `sessions`) yang **tetap tersedia meski aplikasi ditutup dan dibuka kembali**.
  - Wajib menampilkan 5 informasi inti: **sesi praktikum**, **tanggal tagihan**, **nominal**, **waktu transaksi**, dan **status pembayaran (`pending` / `success` / `failed`)**.

---

## 3. Rencana Branching (`feat/`, `fix/`, `chore/`)

| Urutan | Nama Branch | Fokus Deliverable |
| :---: | :--- | :--- |
| 1 | `feat/s4-fine-engine` | `src/lib/fine-rules.ts` & `src/data/actions-fine.ts` (auto-generate 1 denda per keterlambatan, notifikasi `FINE_CREATED`, waiver untuk izin disetujui, proteksi status hadir). |
| 2 | `feat/s4-midtrans-sandbox` | `src/server/midtrans.ts`, API routes `/api/payment/create`, `/api/payment/webhook`, `/api/payment/status`, `.env.example`, dan layar pembayaran `/denda` & `/denda/[id]`. |
| 3 | `feat/s4-payment-notif-history` | Halaman `/denda/riwayat`, komponen `src/components/payment/**`, dan integrasi tipe notifikasi pembayaran di `src/app/(app)/notifikasi.tsx`. |

---

## 4. Physical File Ownership (Exclusive — Nol Konflik)

Yudha memiliki kepemilikan penuh atas file-file berikut dan **tidak boleh** mengedit file milik Daniel atau Zufar:

- **Domain & Business Logic:**
  - `src/lib/fine-rules.ts` *(kalkulasi denda tetap, helper status Midtrans → `'pending' | 'success' | 'failed'`, format nominal Rupiah)*
  - `src/data/actions-fine.ts` *(implementasi hook `onAttendanceRecorded` & `onLeaveApproved` yang sudah di-wire di Commit 0)*
- **Server & API Routes (Midtrans Sandbox):**
  - `src/server/midtrans.ts` *(Midtrans Snap Sandbox client, SHA-512 signature verifier, transaksi update Firestore & trigger notifikasi)*
  - `src/app/api/payment/create+api.ts`
  - `src/app/api/payment/webhook+api.ts`
  - `src/app/api/payment/status+api.ts`
  - `.env.example` *(tambahkan template `MIDTRANS_SERVER_KEY`, `MIDTRANS_CLIENT_KEY`, `MIDTRANS_IS_PRODUCTION=false`)*
- **Komponen UI Baru:**
  - `src/components/payment/fine-card.tsx` *(kartu tagihan & rincian nominal)*
  - `src/components/payment/payment-status-pill.tsx` *(badge status `pending`, `success`, `failed`, `unpaid`, `waived`)*
  - `src/components/payment/midtrans-checkout-modal.tsx` *(WebView / WebBrowser launcher + polling status server)*
- **Layar Expo Router:**
  - `src/app/(app)/denda/index.tsx` *(daftar tagihan aktif & lunas praktikan)*
  - `src/app/(app)/denda/[id].tsx` *(rincian denda + alur pembayaran Midtrans Sandbox)*
  - `src/app/(app)/denda/riwayat.tsx` *(riwayat transaksi & pembayaran persisten)*
  - `src/app/(app)/notifikasi.tsx` *(tambahkan metadata `FINE_CREATED`, `PAYMENT_SUCCESS`, `PAYMENT_FAILED`)*

---

## 5. Checklist Verifikasi (Definition of Done)

- [ ] `npx tsc --noEmit` lulus dengan 0 error.
- [ ] `npx expo lint` lulus dengan 0 error.
- [ ] Presensi pada `<= startsAt + lateAfterMin` tercatat `HADIR` dan **tidak** membuat dokumen di `fines`.
- [ ] Presensi pada `> startsAt + lateAfterMin` tercatat `TERLAMBAT`, membuat **tepat 1** dokumen `fines/{sessionId}__{nim}` dengan nominal tetap, dan mengirim notifikasi `FINE_CREATED`.
- [ ] Praktikan dengan izin `approved` tercatat `IZIN`, tidak menjadi `HADIR`, dan bebas dari denda (`waived` / tanpa tagihan).
- [ ] `POST /api/payment/create` berhasil menghasilkan `redirectUrl` Midtrans Sandbox tanpa menaruh secret key di bundle client.
- [ ] `POST /api/payment/webhook` menolak signature tidak valid (`403`), memperbarui status ke `pending`/`success`/`failed` secara idempotent, memperbarui `fines/{id}`, mengirim notifikasi `PAYMENT_SUCCESS`/`PAYMENT_FAILED`, dan **tidak mengubah** status kehadiran `TERLAMBAT`.
- [ ] Menutup dan membuka kembali aplikasi tetap menampilkan seluruh riwayat pembayaran (sesi, tanggal tagihan, nominal, waktu transaksi, status) di `/denda/riwayat`.
