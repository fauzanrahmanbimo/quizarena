# Rencana Implementasi P1-A (Detail Teknis & Strategi)

Berbeda dengan *Audit*, dokumen ini menjabarkan rancangan arsitektur keamanan, migrasi terstruktur, dan kontrak API untuk transisi sistem tanpa mengganggu P0 yang sudah berjalan di produksi.

## 1. Urutan Migrasi Aman & Rollback (Database)
- **Aturan Emas:** JANGAN menghapus (*drop*) tabel `histories` lama. Transisi ini bersifat **Additive**. Tabel lama tetap ada hingga rilis _sunset_ P0 mendatang.
- **Strategi Rollback:** Menyediakan script `backend/migrations/down.sql` dan `backend/migrations/up.sql`.
- **Versioning:** Menggunakan *timestamp* atau penomoran untuk *migrations*. Eksekusi di *production* bersifat manual atau _gated_, tidak melalui sinkronisasi _script_ inisial secara otomatis saat server dinyalakan.

## 2. Skema Tabel Baru & Index (Additive)
- `users`: (Modifikasi kecil, tidak mengembalikan _hash_)
- `quiz_attempts`: `id`, `client_attempt_id` (UUID dari LS P0), `user_id`, `attempt_type`, `level_id` (NULLABLE), `started_at`, `completed_at`, `total_questions`, `correct_count`, `incorrect_count`, `unanswered_count`, `accuracy`, `average_answer_time`, `passed` (NULLABLE), `created_at`.
  - **Constraints/Index:** `UNIQUE(user_id, client_attempt_id)` untuk Idempotency. Index di `user_id`, `completed_at`, `attempt_type`.
- `quiz_answers`: `id`, `attempt_id`, `question_id`, `topic`, `selected_option_id` (NULLABLE), `correct_option_id`, `is_correct`, `time_spent`.
- `diagnostic_results`: `id`, `user_id`, `attempt_id`, `recommended_level`, `weak_topics_json`, `completed_at`.
- `user_progress`: `user_id`, `recommended_level` (NULLABLE), `highest_unlocked_level`, `updated_at`.

## 3. Strategi Keamanan (Auth, CORS, CSRF, Rate Limit)
- **Auth Cookie HTTP-Only:** Saat *login*/*register*, server menanamkan *cookie* (bukan merespons token dalam JSON). Parameter Cookie: `httpOnly: true`, `path: "/"`, `maxAge`, dan `secure: true` & `sameSite: "none"` ketika berjalan di `NODE_ENV=production` (mengamankan *Cross-Origin*). Klien memakai `credentials: "include"`.
- **CORS:** Dibatasi ketat dari lingkungan `FRONTEND_ORIGINS`. Tidak ada _wildcard_ `*`. Diizinkan untuk _Preflight OPTIONS_ maupun permintaan langsung.
- **CSRF Protection:** Memakai pendekatan _Double-Submit Cookie_. Endpoint `GET /api/auth/csrf` mengatur token acak di _cookie_, yang harus dibaca oleh frontend dan diselipkan pada _header_ `X-CSRF-Token` pada setiap permintaan write (POST/PUT/PATCH/DELETE).
- **Rate Limit:** Modul `express-rate-limit` pada endpoint `register`/`login` (maksimal 5 *request* per 15 menit), serta *limit* yang wajar pada endpoint data. Respons kegagalan autentikasi diredam untuk tidak membocorkan enumerasi akun email.
- **Server-Side Validation:** `accuracy`, `is_correct`, `passed` TIDAK dipercayai bulat-bulat dari frontend. Server mencocokkan `selected_option_id` dengan jawaban dari tabel `questions` untuk mengalkulasi ulang _score_ yang sebenarnya.

## 4. Endpoint Contract Request/Response
- **POST `/api/auth/register` & `/api/auth/login`:**
  - Req: `{ email, password }`
  - Res: `200 OK` (User id, email) + *Cookies terpasang*.
- **POST `/api/auth/logout`:**
  - Req: _Header X-CSRF-Token_
  - Res: `200 OK` + *Clear Cookies*.
- **GET `/api/auth/me`:**
  - Res: `200 OK` `{ id, email, user_progress }`
- **GET `/api/auth/csrf`:**
  - Res: `200 OK` `{ csrfToken }` (Disediakan untuk kemudahan *client* jika tidak langsung mengekstrak *cookie*).
- **POST `/api/progress/sync`:**
  - Req: `[{ client_attempt_id, attempt_type, level_id, started_at, completed_at, answers: [...] }, ...]`
  - Res: `200 OK` `{ importedCount, skippedDuplicateCount, invalidCount, errors: [...] }`

## 5. Strategi Migrasi LocalStorage & Idempotency
- **Modal Integrasi Frontend:** Saat otentikasi tervalidasi dan `api-client` mendeteksi isi localStorage lokal, memunculkan konfirmasi sinkronisasi.
- **Idempotency Sinkron:** Payload di-_hash_ / diawasi oleh `client_attempt_id`. Server menjalankan _Transaction_ untuk menginspeksi `UNIQUE(user_id, client_attempt_id)`. Konflik akan menaikkan metrik `skippedDuplicateCount`, bukannya _error_. Data lokal baru dihapus HANYA jika _response endpoint_ berstatus `2xx` dan `errors` kosong.

## 6. Test Matrix & Deployment Checklist
- **Test Matrix (Unit & Integration):** Hashing _password_, JWT verification, validasi daftar putih (_allowlist_) CORS, pencegatan Token CSRF (Harus _Fail_ jika absen), kalkulasi asersi murni (_accuracy_ dan _unlock logic_), hingga skenario sinkronisasi Idempotency yang dipanggil 2 kali.
- **Deployment Checklist:** Pengaturan `FRONTEND_ORIGINS` koma-pemisah di Vercel/Railway, pengaturan `JWT_SECRET`, skrip eksekusi manual migrasi `.sql`, pengaturan konfigurasi cookie production.
