# Laporan Pengembangan: Penambahan Level 21-30

## Tujuan Tugas
Menambahkan Latihan/Level 21 sampai 30 beserta konten pertanyaannya tanpa merusak fitur dan level 1-20 yang sudah ada. Menjamin kelancaran alur navigasi kurikulum, serta mengimplementasikan skrip validasi lokal dan melakukan audit QA (Konten, UI, Navigasi) secara mendalam.

## Informasi Git
- **Branch:** feature/levels-21-30
- **URL Pull Request:** https://github.com/fauzanrahmanbimo/quizarena/pull/8

## Lingkungan & Deployment
- **URL Preview Vercel:** (Tersedia pada halaman PR di GitHub)

## Daftar File yang Berubah (1 Commit Aktual)
- `questions/default.json` - Menambahkan 300 pertanyaan baru untuk level 21 hingga 30.
- `level_meta.json` - Menambahkan 10 metadata level baru.
- `index.html` - Menambahkan konten "MATERI" pembelajaran untuk level 21-30 dan pesan tamat Level 30.
- `scripts/validate-question-bank.js` - Menambahkan skrip validasi QA lokal.
- `CONTENT_AUDIT_LEVELS_21_30.md` - Laporan audit spesifik QA konten untuk Level 21-30.

## Ringkasan Perubahan Perilaku Aplikasi
- Pengguna melihat tab navigasi "Level 21–30". 
- Kurikulum Level 21-30 tersedia.
- Menekan "Level Berikutnya" di Level 20 menuju ke Level 21 secara otomatis.
- Menyelesaikan Level 30 tidak akan memunculkan "Level Berikutnya", tetapi akan memunculkan "Selamat! Anda telah menyelesaikan seluruh 30 latihan."

## Pengujian
1. **Validasi Skrip JSON:**
   `node scripts/validate-question-bank.js` berjalan dengan *0 error*.
2. **Audit Konten QA:**
   Dari 300 soal, ditemukan 6 soal pada Level 21 yang tidak memiliki tanda baca titik di akhir kalimat. Telah diperbaiki langsung.
3. **Audit Logika & Fallback (Puppeteer Local Test):**
   - **USE_BACKEND = false:** Level 21-30 tetap ter-load melalui `default.json` dan kuis bisa dimainkan normal (teruji membuka pertanyaan pertama Level 21).
   - **Simulasi Backend Error:** URL backend sengaja disalahkan. Aplikasi menampung kegagalan tanpa *blank screen* dan fallback ke `default.json` tetap memunculkan level dengan lancar.
4. **Audit UI & Aksesibilitas:**
   - Tab khusus dinamakan dengan eksplisit `"Level 21–30"` yang mudah dibedakan.
   - Semua *page-tab* diuji dapat dinavigasi mulus via tombol **Tab** dan dipicu melalui **Enter** pada skrip *Puppeteer*.

## Risiko dan Keterbatasan
- JSON membengkak menjadi 900 soal, namun performa parsial pada browser masih stabil.

## Langkah Pengujian Manual
1. Buka URL Preview Vercel.
2. Klik tombol navigasi level menggunakan tombol Tab pada Keyboard.
3. Buka Level 21, mainkan.
4. Modifikasi konfigurasi jika ingin menguji fallback, matikan koneksi internet sesaat.
