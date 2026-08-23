# Backup Strategy & Decision Tree (Production MySQL)

Dokumen ini mendefinisikan strategi dan hierarki pengamanan data (backup) untuk database MySQL di Railway *production*, memastikan rahasia tidak terekspos dan tidak ada manipulasi jaringan publik jika memungkinkan.

## Hierarki Prioritas Backup

### Prioritas A: Railway Native Volume Snapshot (Pilihan Paling Aman)
**Kondisi**: Jika Anda berlangganan *Pro plan* atau memiliki layanan MySQL berbasis *Volume* yang mendukung *Snapshot*.
- **Cara Kerja**: Snapshot merekam kondisi *byte-level* dari volume disk secara internal.
- **Langkah Operator**:
  1. Buka Railway Dashboard → Pilih Project & Environment.
  2. Buka layanan MySQL → tab **Data** / **Backups** / **Volumes**.
  3. Cari tombol **Take Snapshot** atau **Backup**.
- **Status**: **VERIFIED** jika operator dapat melakukannya, **UNKNOWN** jika menu tidak tersedia.

### Prioritas B: Internal Backup Job Service (Pilihan Aman Tanpa Public Proxy)
**Kondisi**: Jika Snapshot tidak tersedia, namun Anda tidak ingin membuka Public TCP Proxy.
- **Cara Kerja**: Anda *deploy* layanan sementara khusus (*One-off Job*) berbasis Docker image (misal: `mysql:8`) ke jaringan internal yang sama dengan MySQL Anda (`.railway.internal`). Skrip di dalamnya mengeksekusi `mysqldump` dan memindahkannya ke Object Storage (S3/R2) atau *Persistent Volume* yang di-*mount*.
- **Kendala**: Jika Anda tidak mengonfigurasi Object Storage (misal AWS S3 atau Cloudflare R2) sebagai penampung permanen, dump akan hilang karena sifat kontainer Railway yang *ephemeral* (sementara).
- **Langkah Operator**:
  1. Deploy *Empty Service* dengan Dockerfile berisi `mysqldump` dan skrip sinkronisasi S3.
  2. Pasang variabel `DATABASE_URL` ke layanan tersebut.
  3. Trigger layanan. Output tersimpan di AWS/R2.
- **Status**: **BLOCKED** jika Anda belum menyiapkan *bucket* S3/R2 atau *Volume* khusus.

### Prioritas C: Public TCP Proxy (Last Resort - Pilihan Terakhir)
**Kondisi**: Jika A (Snapshot) tidak ada, dan B (S3 Storage) belum dipersiapkan, maka satu-satunya cara melakukan *logical backup* `mysqldump` ke *laptop lokal* adalah via TCP Proxy Publik.
- **Cara Kerja**: Membuka jalur eksternal langsung ke kontainer MySQL. Kredensial dipasangkan sebagai *environment variable* di terminal Windows PowerShell operator (`$env:DATABASE_URL`). Eksekusi `node scripts/dump-database.js` menghasilkan *file* berekstensi `.sql` ke folder eksternal repositori (`Downloads`).
- **Peringatan**: Operator **WAJIB** meminta persetujuan eksplisit. Jalur publik ini wajib **dimatikan segera** setelah selesai. Jangan pernah meletakkan kredensial di chat, history, atau repositori Git.

---

## Aturan Keamanan Eksekusi (Guardrails)
- `dump-database.js` tidak akan mencetak kredensial ke konsol (password dikirim lewat *environment child process* `MYSQL_PWD`).
- `.gitignore` mencegah *.sql* ter-commit secara tidak sengaja.
- Skrip menolak menyimpan *backup* di dalam direktori repository GitHub. Lokasi diarahkan secara mutlak ke folder `$HOME/Downloads/quizarena-db-backups/`.
