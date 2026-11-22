# LabSync Sprint 3 — API Contract & Payload Samples

Dokumen ini adalah referensi kontrak payload HTTP nyata untuk integrasi antara **Daniel (Backend/API)** dan **Agiel (Scanner & Client Check-in)**.

---

## 1. `POST /api/attendance/challenges` (Penerbitan & Rotasi QR)

Dipanggil oleh asisten pemilik sesi saat sesi berstatus `DIBUKA` untuk memperoleh payload QR dan masa aktif (TTL).

### Request
* **Method:** `POST`
* **Path:** `/api/attendance/challenges`
* **Headers:**
  ```http
  Authorization: Bearer <Firebase_ID_Token_Asisten>
  Content-Type: application/json
  ```
* **Body:**
  ```json
  {
    "sessionId": "demo-mobile"
  }
  ```

### Response Sukses (HTTP 200 OK)
```json
{
  "qr": {
    "version": 1,
    "sessionId": "demo-mobile",
    "challengeId": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
    "token": "dGhpcy1pcy1hLXJhbmRvbS1jcnlwdG8tdG9rZW4"
  },
  "expiresAt": "2026-11-20T12:01:00.000Z",
  "ttlSeconds": 60
}
```

> **Catatan untuk Agiel (Scanner):**
> * Praktikan memindai string JSON di dalam field `qr` di atas:
>   `{"version":1,"sessionId":"...","challengeId":"...","token":"..."}`
> * Token yang dikirim ke server saat check-in adalah nilai `token` mentah dari QR. Server hanya menyimpan SHA-256 hash token tersebut untuk verifikasi.

### Response Error
| HTTP Status | Error Code | Contoh Respons JSON | Penjelasan |
| :--- | :--- | :--- | :--- |
| **401 Unauthorized** | `AUTH_REQUIRED` | `{"error":{"code":"AUTH_REQUIRED","message":"Header Authorization: Bearer <token> wajib disertakan."}}` | Token login tidak ada atau kedaluwarsa |
| **403 Forbidden** | `FORBIDDEN` | `{"error":{"code":"FORBIDDEN","message":"Akses ditolak. Hanya asisten pengampu kelas yang berhak menerbitkan QR presensi."}}` | Bukan asisten pengampu sesi ini |
| **404 Not Found** | `SESSION_NOT_FOUND` | `{"error":{"code":"SESSION_NOT_FOUND","message":"Sesi praktikum dengan ID \"xyz\" tidak ditemukan."}}` | Session ID tidak terdaftar |
| **409 Conflict** | `SESSION_CLOSED` | `{"error":{"code":"SESSION_CLOSED","message":"Sesi praktikum saat ini berstatus \"TERJADWAL\". QR hanya dapat diterbitkan saat sesi DIBUKA."}}` | Sesi belum dibuka atau sudah selesai |
| **409 Conflict** | `LAB_NOT_CONFIGURED` | `{"error":{"code":"LAB_NOT_CONFIGURED","message":"Sesi praktikum belum memiliki konfigurasi laboratorium atau snapshot kebijakan presensi."}}` | Asisten belum memilih lab aktif & radius |

---

## 2. `POST /api/attendance/check-in` (Preview Kontrak Tahap 3)

Dipanggil oleh praktikan setelah memindai QR dan mendapatkan fix lokasi perangkat.

### Request
* **Method:** `POST`
* **Path:** `/api/attendance/check-in`
* **Headers:**
  ```http
  Authorization: Bearer <Firebase_ID_Token_Praktikan>
  Content-Type: application/json
  ```
* **Body:**
  ```json
  {
    "sessionId": "demo-mobile",
    "challengeId": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
    "token": "dGhpcy1pcy1hLXJhbmRvbS1jcnlwdG8tdG9rZW4",
    "location": {
      "latitude": -6.2088,
      "longitude": 106.8456,
      "accuracyMeters": 12.5,
      "capturedAtMs": 1790000000000
    },
    "notes": "PC-14"
  }
  ```

### Response Sukses (HTTP 200 OK)
```json
{
  "status": "recorded",
  "attendanceId": "demo-mobile__studentUid123",
  "checkedInAt": "2026-11-20T12:00:15.000Z",
  "distanceMeters": 14.2,
  "radiusMeters": 50
}
```

Bila request dikirim ulang (retry aman):
```json
{
  "status": "already-recorded",
  "attendanceId": "demo-mobile__studentUid123",
  "checkedInAt": "2026-11-20T12:00:15.000Z",
  "distanceMeters": 14.2,
  "radiusMeters": 50
}
```
