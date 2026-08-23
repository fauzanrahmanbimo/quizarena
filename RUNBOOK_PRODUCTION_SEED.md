# RUNBOOK: Production Migration & Seed (Railway)

**PERINGATAN KERAS:**
- Operator harus memakai akun Railway yang terautentikasi dan memiliki akses ke proyek production QuizArena.
- **JANGAN PERNAH** *paste* `DATABASE_URL`, `MYSQL_URL`, password, atau kredensial rahasia apa pun ke dalam terminal, chat, atau GitHub.
- Pastikan Anda sudah membuat *Backup* / *Snapshot* sebelum melakukan eksekusi perintah di bawah.
- Jangan gunakan opsi migrasi mundur (*down migration*) di production!

---

## 1. Preflight Lingkungan Lokal (PowerShell)
Buka terminal PowerShell Anda dan jalankan perintah berikut secara berurutan. Perintah ini tidak akan mengubah database, hanya memastikan state Anda benar.

```powershell
# 1. Pastikan Git berada pada branch dan status yang benar
git status
git branch --show-current
# Harapan: branch "feature/p1-a-backend-sync" dan "nothing to commit"

git log -1 --oneline
# Harapan: Memuat commit keamanan terakhir (misal: "fix: refactor database.js...")

# 2. Pastikan node dan Railway CLI siap
node --version
railway --version

# 3. Autentikasi dan tautkan ke Railway
railway login
railway link
# (Pilih proyek dan environment QuizArena Production)

railway status
railway environment
```

---

## 2. Backup / Snapshot MySQL
Lakukan pengamanan data melalui UI Railway (cara teraman agar rahasia tidak bocor ke terminal):
1. Buka *Dashboard* Railway.
2. Buka layanan **MySQL**.
3. Pindah ke tab **Data** lalu temukan opsi **Backup** / **Snapshot**.
4. Klik **Take Snapshot** dan tunggu hingga selesai.
5. Catat waktu snapshot dan pastikan Environment-nya benar.

**Kondisi STOP:** Jika snapshot gagal dibuat, atau database tidak mendukung snapshot, **BERHENTI**. Laporkan status *BLOCKED*. Jangan lanjutkan ke langkah 3.

---

## 3. Eksekusi Skema dan Bank Soal

Eksekusi perintah berikut secara persis melalui PowerShell. Perintah `railway run` secara otomatis menginjeksikan variabel production (termasuk `DATABASE_URL`) ke skrip lokal Anda secara aman.

### A. Migration Pertama (Membuat Tabel)
```powershell
Push-Location backend
railway run node scripts/migrate.js up
Pop-Location
```
**Harapan Output:**
`Running migration: 01_p1_additive_schema.sql...`
`Applied: 01_p1_additive_schema.sql`
`Running migration: 02_p1_seed_schema.sql...`
`Migration completed successfully.`

### B. Migration Kedua (Idempotensi)
```powershell
Push-Location backend
railway run node scripts/migrate.js up
Pop-Location
```
**Harapan Output:**
`Migration 01_p1_additive_schema.sql already applied. Skipping.`
`Migration completed successfully.`

### C. Cek Data Lama (Histories)
Pastikan data pengguna lama tidak terhapus.
```powershell
railway connect mysql
# Masuk ke prompt MySQL, jalankan:
SELECT count(*) FROM histories;
exit
```
**Harapan:** Jika *production* sudah ada isinya sebelumnya, jumlah *count* tidak boleh menjadi 0. Jika sebelumnya memang kosong, aman.

### D. Uji Coba Seed (Dry-Run)
```powershell
Push-Location backend
railway run node scripts/seed-question-bank.js
Pop-Location
```
**Harapan Output:**
`Starting Question Bank Seed... (Mode: DRY-RUN)`
`Validated: 900 questions, 30 unique levels.`
`DRY-RUN completed successfully.`

### E. Seed Tahap I (Apply)
```powershell
Push-Location backend
railway run node scripts/seed-question-bank.js --apply
Pop-Location
```
**Harapan Output:**
`APPLY SUCCESS: Levels processed: 30. Questions inserted: 900, updated: 0.`

### F. Seed Tahap II (Idempotency Check)
```powershell
Push-Location backend
railway run node scripts/seed-question-bank.js --apply
Pop-Location
```
**Harapan Output:**
`APPLY SUCCESS: Levels processed: 30. Questions inserted: 0, updated: 900.`

### G. Parity Verifier
```powershell
Push-Location backend
railway run node scripts/verify-question-bank-parity.js
Pop-Location
```
**Harapan Output Wajib:**
`Source Total: 900`
`Database Total: 900`
`Missing in DB: 0`
`Unexpected in DB: 0`
`PARITY CHECK PASSED.` (Exit code 0).

**Kondisi STOP:** Jika verifier memberikan *skipped*, *database unavailable*, atau jumlah berbeda, laporkan **BLOCKED**.

### H. Final Health Check
Buka browser Anda dan kunjungi endpoint backend Railway nyata:
`https://<domain-backend-anda>/health`
**Harapan:** `HTTP 200 {"status":"ok","database":"connected"}`

---

## 4. Format Laporan Kembali (Template)
Jika Anda (Operator) sudah selesai, laporkan kembali kepada saya menggunakan *template* ini tanpa menyertakan secret apa pun:

```
Backup MySQL: BERHASIL (Waktu: ...)
Migration 1: [Output disanitasi]
Migration 2: [Output disanitasi]
Check Histories: [Aman / Tidak Aman]
Dry-Run Seed: [Output]
Seed Pertama: [Output]
Seed Kedua: [Output]
Parity Exit Code: [Kode] | Missing: [X] | Unexpected: [Y]
Health Check Akhir: [HTTP Status]
```
