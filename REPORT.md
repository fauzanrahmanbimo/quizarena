# Laporan Pengembangan: Penambahan Level 21-30

## Tujuan Tugas
Menambahkan Latihan/Level 21 sampai 30 beserta konten pertanyaannya tanpa merusak fitur dan level 1-20 yang sudah ada. Menjamin kelancaran alur navigasi kurikulum, serta mengimplementasikan skrip validasi lokal untuk menjamin integritas data pertanyaan.

## Informasi Git
- **Branch:** feature/levels-21-30
- **URL Pull Request:** (Akan diisi setelah PR dibuat)

## Lingkungan & Deployment
- **URL Preview Vercel:** (Akan tersedia setelah PR dibuat dan Vercel memproses)

## Daftar File yang Berubah
- `questions/default.json` - Menambahkan 300 pertanyaan baru untuk level 21 hingga 30. Total pertanyaan bertambah dari 600 menjadi 900.
- `level_meta.json` - Menambahkan metadata untuk level 21 hingga 30 (nama level, kesulitan, deskripsi, emoji).
- `index.html` - Menambahkan konten "MATERI" pembelajaran untuk level 21-30. Memperbaiki logika `finish()` agar memunculkan pesan tamat pada Level 30 ("Selamat! Anda telah menyelesaikan seluruh 30 latihan.").
- `scripts/validate-question-bank.js` - Skrip validasi baru untuk memeriksa integritas ID, _originalLevel, metadata, format opsi, jawaban, dan kelengkapan 900 pertanyaan.

## Ringkasan Perubahan Perilaku Aplikasi
- **Daftar Level:** Pengguna kini akan melihat "Level 21–30" pada tab navigasi halaman beranda yang dirender secara otomatis berdasarkan pagination.
- **Kurikulum Level 21-30:**
  - Level 21: Daily Activities Lanjutan (Sedang)
  - Level 22: Telling Time & Schedules (Sedang)
  - Level 23: Places, Directions & Transportation (Sedang)
  - Level 24: Food, Shopping & Quantities (Sedang)
  - Level 25: Simple Present vs Present Continuous (Sedang)
  - Level 26: Simple Past Tense (Sulit)
  - Level 27: Future Plans: Will & Going To (Sulit)
  - Level 28: Comparative & Superlative Adjectives (Sulit)
  - Level 29: Reading Comprehension Dasar (Sulit)
  - Level 30: Final Challenge: Mixed English Skills (Sulit)
- **Navigasi Akhir:** Menyelesaikan Level 20 akan otomatis menampilkan opsi tombol ke Level 21. Namun, pada saat menyelesaikan Level 30 (maksimal), tombol "Level Berikutnya" tidak akan muncul dan digantikan oleh pesan apresiasi khusus kelulusan seluruh kurikulum.
- **Level 1-20:** Tidak ada file maupun logika di level 1-20 yang diubah atau dirusak. Konsistensi UI dan UX dipertahankan sepenuhnya.

## Pengujian
**Perintah Pengujian yang Dijalankan:**
`node scripts/validate-question-bank.js`

**Hasil Pengujian:**
Lolos. Seluruh 900 pertanyaan dan 30 metadata dinyatakan valid.
- Tidak ada ID duplikat.
- Setiap level (1-30) tepat memiliki 30 soal.
- Semua atribut (_originalLevel, question, options, correctIndex, explanation, dll.) lengkap.

## Risiko dan Keterbatasan
File `questions/default.json` kini berukuran lebih besar akibat memuat 900 pertanyaan. Namun karena mekanisme pengambilan JSON masih sangat cepat dan efisien di memori browser modern, dampaknya terhadap performa sangat minim. Tidak ada backend terikat dalam tugas ini; fallback statis terjamin aman.

## Langkah Pengujian Manual
1. Buka URL Preview Vercel saat sudah tersedia.
2. Pada halaman awal (Daftar Level), klik tab "Level 21–30". Pastikan 10 level baru muncul.
3. Klik Level 21, klik "Mulai Kuis", dan pastikan pertanyaan berjalan.
4. **Uji Navigasi Level 20 ke 21:** Selesaikan Level 20 (atau ubah stat currentLevel menjadi 19 pada console), lalu pastikan tombol "Level Berikutnya" tampil dan berhasil membuka Level 21.
5. **Uji Selesai Level 30:** Selesaikan Level 30, lalu pastikan tombol "Level Berikutnya" disembunyikan dan terdapat pesan "Selamat! Anda telah menyelesaikan seluruh 30 latihan."
6. Uji fitur Mode Latihan (pembahasan instan) dan Tinjau Jawaban pada salah satu level baru.
