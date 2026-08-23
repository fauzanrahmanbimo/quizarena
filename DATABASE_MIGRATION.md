# Database Migration Log

## Deployment: P1-A Backend Sync (Initial Database Provisioning)
**Date:** 2026-08-23
**Environment:** Production (Railway)
**Status:** SUCCESS

### 1. Preflight Condition
- Database awal diperiksa melalui perintah *read-only* (`SHOW TABLES;`).
- Hasil: `Empty set` (Tidak ada tabel aplikasi maupun data pengguna).
- **No-backup Justification**: Karena database produksi terbukti kosong 100%, prosedur `dump-database.js` tidak dapat atau perlu mengamankan state sebelumnya. *Backup* di-skip untuk rilis skema *awal* (initial provisioning) ini saja.

### 2. Migrations Applied
Perintah dieksekusi: `node scripts/migrate.js`
1. `01_p1_additive_schema.sql`
   - *Tabel Terbuat*: `schema_migrations`, `users`, `histories`, `quiz_attempts`, `quiz_answers`, `diagnostic_results`, `user_progress`
2. `02_p1_seed_schema.sql`
   - *Tabel Terbuat*: `levels`, `questions`

Pengecekan idempotensi (run ke-2) berhasil di-*skip*.

### 3. Aturan Backup untuk Migrasi Selanjutnya
Sesuai kesepakatan dalam `BACKUP_STRATEGY.md`, untuk semua rilis mulai hari ini dan ke depannya:
- **WAJIB** melakukan prosedur backup sebelum mengeksekusi `migrate.js`.
- Tidak ada pengecualian. *Data loss* pada tabel `users` atau `user_progress` tidak dapat ditoleransi.
