# Audit Backend QuizArena

## 1. Stack & Environment
- **Runtime**: Node.js
- **Framework**: Express.js (v5.2.1)
- **Database**: MySQL (diakses menggunakan pustaka `mysql2/promise`)
- **Authentication**: JWT (`jsonwebtoken`) dan Bcrypt (`bcrypt` v6) untuk hashing password.
- **Environment Variables**:
  - `PORT`: Port server backend (default 5000)
  - `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`: Kredensial MySQL
  - `DATABASE_URL`: Alternatif koneksi database via URL (misalnya untuk deployment Railway)
  - `JWT_SECRET`: Kunci rahasia untuk _signing_ JSON Web Token.

## 2. Struktur Direktori
- `config/database.js`: Mengatur *connection pool* MySQL.
- `middleware/auth.js`: Middleware otentikasi JWT yang mengekstrak token dari *header* `Authorization`.
- `controllers/`: Berisi logika *endpoint* (`authController.js`, `historyController.js`, `questionController.js`).
- `routes/`: Mendefinisikan _router_ Express.

## 3. Database Schema (Saat ini)
- `users`: `id`, `email`, `password`, `created_at`
- `questions`: `id`, `category`, `difficulty`, `question`, `options`, `correct_index`, `explanation`, `created_by`, `created_at`
- `histories`: Struktur monolithic yang menyimpan data sesi, di mana rincian jawaban disimpan sebagai JSON string di kolom `question_details`. Struktur lama ini belum sepenuhnya kompatibel dengan struktur attempt P0 terbaru (diagnostic, practice, timed_quiz).

## 4. Analisis Endpoint
- **Auth**: `/api/auth/register` & `/api/auth/login` (Tersedia, mengembalikan JWT di JSON body). **Kekurangan**: Belum ada `POST /logout` atau `GET /me`. Belum ada proteksi _rate limit_.
- **Questions**: `/api/questions` (CRUD soal).
- **History**: `/api/history` (CRUD riwayat).

## 5. Deployment Backend
- Berdasarkan `config.js` di klien, backend dideploy ke platform Railway (`https://quizarena-production-3105.up.railway.app`). Database kemungkinan menggunakan MySQL terkelola (Railway MySQL).
- Klien mendukung fallback ke _localStorage murni_ via toggle `USE_BACKEND`.

## 6. Gap & Risiko Keamanan Terhadap Syarat P1-A
- Schema database harus dibongkar dan diselaraskan: `histories` perlu dipecah menjadi `quiz_attempts` dan relasi `quiz_answers`.
- Token dikembalikan di JSON body, sedangkan untuk keamanan ekstra (XSS), token disarankan di Cookie HttpOnly jika memungkinkan. Mengingat klien di platform/domain berbeda, pengkondisian _CORS_ dengan _credentials_ sangat krusial.
- Tidak ada _rate limiting_ pada endpoint Auth.
- Tidak ada validasi data level, diagnostik, dan progres keseluruhan di sisi server (`user_progress`, `diagnostic_results`).
