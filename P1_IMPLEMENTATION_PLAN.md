# Rencana Implementasi P1-A (Authentication & Backend Sync)

## Tujuan
Memigrasikan arsitektur *local-only* MVP menjadi arsitektur _hybrid_ tersinkronisasi (klien + server) yang aman dan berintegritas tanpa merusak fitur P0.

## 1. Persiapan Backend (Server-side)

### 1.1 Database Schema (MySQL)
Merombak tabel lama dan menambahkan struktur baru:
- `users`: ID, email, password_hash, created_at.
- `levels`: ID, unlock_threshold.
- `questions`: Pembersihan skema soal dengan validasi opsi (stabilitas ID).
- `quiz_attempts`: `id`, `user_id`, `attempt_type` (enum), `level_id`, `started_at`, `completed_at`, `total_questions`, `correct_count`, `incorrect_count`, `accuracy`, `passed`.
- `quiz_answers`: `id`, `attempt_id`, `question_id`, `topic`, `is_correct`, `time_spent`.
- `user_progress`: `user_id`, `highest_unlocked_level`, `total_xp`.
- `diagnostic_results`: `id`, `user_id`, `recommended_level`, `created_at`.

### 1.2 Endpoint API
Membuat dan menyempurnakan endpoint:
- **Auth**: `POST /auth/register`, `POST /auth/login`, `POST /auth/logout` (dengan Cookie HttpOnly/Secure dan pembatasan _rate limit_), `GET /me`.
- **Sync**: `POST /progress/sync` (Menerima _payload_ _localStorage_ lama dengan _idempotency key_ / `attemptId` untuk mencegah duplikasi).
- **Attempts**: `GET /attempts` (Untuk _dashboard_ _multi-device_), `POST /attempts` (Untuk _submit_ secara _real-time_ pasca latihan).
- **Dashboard**: `GET /dashboard` (Rekapitulasi progres).

### 1.3 Keamanan
- Middleware `authenticateToken` untuk melindungi _endpoint_ progres.
- Hash password dengan Bcrypt.
- Sanitasi input dan pencegahan kebocoran _stack trace_ di lingkungan *production*.

## 2. Integrasi Frontend (Client-side)

### 2.1 Pemisahan Modul API
- Membuat modul `scripts/api-client.js` untuk membungkus panggilan `fetch()` dengan injeksi token / pengaturan _credentials_ (Cookies).
- Memastikan `USE_BACKEND` pada `config.js` berperan ganda: jika _false_, jatuh kembali secara utuh ke _localStorage_ murni tanpa melempar _error_ UI.

### 2.2 Alur Otentikasi & Modal Migrasi
1. Menambahkan tombol Login / Register.
2. Saat registrasi sukses atau login dilakukan di perangkat dengan data lokal P0, aplikasi mengecek isi `quizarena_..._fullAttemptsLog`.
3. Jika data lokal eksis, modal konfirmasi muncul: _"Temukan progres belajar lokal... Sinkronkan?"_
4. Jika Ya -> Memanggil `POST /progress/sync`. Hasilnya dicetak (dipindahkan/dilewati/gagal).
5. Setelah sinkronisasi, sumber kebenaran (Source of Truth) _Dashboard_ beralih ke panggilan `GET /dashboard`.

### 2.3 Mekanisme Sinkronisasi (Idempotency)
- Payload `POST /progress/sync` memanfaatkan `attemptId` yang sudah memiliki format unik. Server menggunakan klausul `INSERT IGNORE` atau `UPSERT` untuk mencegah pencatatan ulang.

## 3. Tahapan Pengujian (Testing)
- **Unit Test (Server)**: Hash otentikasi, otorisasi, penanganan JWT kedaluwarsa, dan fungsi kalkulasi _progress_.
- **E2E / Integration Test (Client)**: Menggunakan skrip Puppeteer untuk mensimulasikan registrasi pengguna baru, pengambilan kuis (tersimpan secara lokal), dilanjutkan dengan login yang memicu sinkronisasi otomatis.
- **Regression**: Menjalankan kembali tes P0 untuk memastikan alur luring (_offline_) masih berfungsi 100%.

## 4. Rencana Deployment
- Memastikan Railway / platform terkait memperbarui skema _database_.
- Mempersiapkan variabel lingkungan produksi (`CORS_ORIGIN`, `JWT_SECRET`, dll) pada panel manajemen rahasia.
