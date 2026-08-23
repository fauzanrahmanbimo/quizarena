# QuizArena Backend API

Backend REST API untuk aplikasi QuizArena, dibangun menggunakan Node.js, Express, MySQL, dan JWT.

## Prasyarat
- Node.js (v14+)
- MySQL Server

## Setup dan Instalasi

1. Clone repository dan navigasi ke folder `backend`.
2. Jalankan `npm install` untuk menginstal dependensi.
3. Buat file `.env` dari template:
   ```bash
   cp .env.example .env
   ```
   Sesuaikan kredensial MySQL Anda (`DB_USER`, `DB_PASSWORD`, dll).
4. Buat database MySQL:
   ```bash
   mysql -u root -p < schema.sql
   ```
5. Jalankan server lokal:
   ```bash
   npm start
   # atau menggunakan nodemon: npm run dev
   ```

Server akan berjalan pada `http://localhost:5000`.

## Daftar Endpoint

### Autentikasi
- `POST /api/auth/register` 
  - Body: `{ "email": "user@example.com", "password": "password123" }`
- `POST /api/auth/login`
  - Body: `{ "email": "user@example.com", "password": "password123" }`

### Manajemen Bank Soal
*(Gunakan Header `Authorization: Bearer <token>` untuk operasi write)*
- `GET /api/questions`
- `POST /api/questions` 
  - Body: `{ "category": "Math", "difficulty": "Mudah", "question": "1+1?", "options": ["1", "2", "3", "4"], "correctIndex": 1, "explanation": "Mudah" }`
- `PUT /api/questions/:id`
- `DELETE /api/questions/:id`

### Riwayat Nilai
*(Semua endpoint membutuhkan autentikasi token JWT)*
- `POST /api/history`
  - Body: `{ "mode": "level", "totalQuestions": 10, "correctCount": 8, "wrongCount": 2, "skippedCount": 0, "accuracy": 80, "durationSeconds": 120, "questionDetails": [...] }`
- `GET /api/history`
- `GET /api/history/stats`
\n## Database & Migrations\n\n### Menjalankan Migrasi Skema\n\ash\nnode scripts/migrate.js up\n\\
\n### Menjalankan Seed Bank Soal (Dry-Run)\n\ash\nnode scripts/seed-question-bank.js\n\\
\n### Menulis Seed ke Database\n\ash\nnode scripts/seed-question-bank.js --apply\n\\
\n### Verifikasi Kesejajaran Bank Soal (Parity)\n\ash\nnode scripts/verify-question-bank-parity.js\n\\
