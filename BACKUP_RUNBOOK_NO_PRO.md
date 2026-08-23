# Logical Database Backup Runbook (No-Pro / No Snapshot)

Runbook ini diperuntukkan bagi Operator (Local PowerShell) untuk membuat salinan data (*logical backup*) aman pada lingkungan produksi Railway secara terotomasi dan privat. Tanpa membocorkan rahasia.

## 1. Verifikasi MySQL Client
Pastikan mesin Windows Anda memiliki `mysqldump` terinstal:
```powershell
mysqldump --version
```
Jika gagal/tidak ditemukan, install via Winget tanpa mengotori environment Railway:
```powershell
winget install Oracle.MySQL
# Buka terminal PowerShell baru setelah instalasi agar PATH terbaca
```

## 2. Posisikan Link Railway dan Folder
Pastikan `railway status` Anda sudah terkait dengan service **backend** (yang memiliki environment variable lengkap).
```powershell
# Tarik perubahan skrip backup terbaru
git pull origin feature/p1-a-backend-sync
# Pindah ke backend
Push-Location backend
```

## 3. Eksekusi Backup Aman
Jalankan skrip dump yang sudah saya racik. Skrip ini akan secara otomatis membedah URL/Kredensial Railway dari `railway run` dan mem-parsingnya ke dalam *engine* eksekusi `mysqldump` terisolasi:

```powershell
railway run node scripts/dump-database.js
```

**Harapan Output:**
```text
Starting logical database backup...
Connecting to database host: ...
Destination: C:\Users\...\Downloads\quizarena-db-backups\backup_quizarena_xxxx.sql
Backup completed successfully.
File size: X bytes.
You can now verify the backup using PowerShell.
```
*(Catatan: Anda mungkin melihat peringatan 'Using a password on the command line interface can be insecure'. Ini aman diabaikan karena skrip kita tidak menjalankan shell asli melainkan API `spawn` tertutup Windows, dan rahasia tidak bocor ke konsol).*

## 4. Validasi Keabsahan Backup
Setelah berhasil, navigasikan (Pop-Location boleh nanti) atau buka tab baru, dan uji hasil *dump* secara *read-only*:

```powershell
# Temukan file backup Anda di C:\Users\fauza\Downloads\quizarena-db-backups\
$backupFile = Get-ChildItem -Path "$HOME\Downloads\quizarena-db-backups" -Filter "backup_*.sql" | Sort-Object LastWriteTime -Descending | Select-Object -First 1

# 1. Cek ukuran (harus > 0)
$backupFile.Length

# 2. Periksa marker skema dan tabel secara aman tanpa membocorkan data row
Select-String -Path $backupFile.FullName -Pattern "CREATE TABLE" | Select-Object -First 5

# 3. Kunci hash SHA256 (Sebagai catatan pelaporan)
Get-FileHash -Algorithm SHA256 -Path $backupFile.FullName
```

## 5. Keputusan
- **Jika ukuran file > 0 dan Hash SHA256 terbentuk,** serta Anda melihat `CREATE TABLE` milik QuizArena, lapor kembali ke saya di obrolan dengan kalimat: `"BACKUP READY: [Sebutkan Hash SHA256]"`.
- **Jika gagal, file kosong, atau error `mysqldump`,** lapor: `"BACKUP BLOCKED: [Sebutkan error (disanitasi)]"`.
