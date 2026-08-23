# Release Notes: QuizArena v1.0.0-MVP

Ini adalah rilis MVP (Minimum Viable Product) untuk QuizArena, platform belajar Bahasa Inggris interaktif. Versi ini telah mencapai penyelesaian seluruh target **P0 (Phase 0)** yang berfokus pada pengalaman klien (client-side experience) yang solid, struktur data yang kokoh, dan UI yang responsif.

## Fitur Baru (P0-A hingga P0-E)

- **[P0-A] Diagnostic / Placement Test (15 Soal):** Memungkinkan pengguna baru mengetahui level Bahasa Inggris mereka dengan algoritma pemetaan skor yang diuji akurasinya. Tes ini menggunakan *pool* soal unik, tanpa pewaktu, dan mencegah duplikasi soal.
- **[P0-B] Learning Path & Progression Guard:** Sistem kunci level berbasis hierarki (Level 1 terbuka, sisanya terkunci hingga lulus level sebelumnya dengan nilai >= 70%). Status visual seperti "Terkunci", "Proses", "Direkomendasikan", "Selesai", dan "Ulangi" telah diimplementasikan dengan SVG elegan.
- **[P0-C] Solid Quiz Engine & Anti-Cheat Ringan:** Pengacakan urutan soal dan pilihan jawaban dengan algoritma *Fisher-Yates* tanpa merusak pemetaan jawaban benar. Mekanisme pewaktu akan jeda (*pause*) secara otomatis ketika tab browser disembunyikan (*Visibility API*).
- **[P0-D] Hasil Evaluatif & Pembahasan:** Halaman hasil latihan yang kaya, menampilkan akurasi, waktu rata-rata, jumlah soal tak terjawab, dan *filter* tinjauan (Semua/Benar/Salah). Keamanan *Cross-Site Scripting* (XSS) dijamin karena semua teks dirender menggunakan `.textContent` DOM murni.
- **[P0-E] Dashboard Progres Pelajar:** Dasbor komprehensif yang menampilkan riwayat sesi, grafik performa, statistik akurasi, hingga ekstraksi "Topik Terkuat" dan "Topik Lemah". Memanfaatkan *pure functions* untuk memastikan integritas data (mis. sesi diagnostik tidak mencemari nilai rata-rata latihan).

## Batasan Arsitektur MVP (localStorage)

Pada rilis ini, seluruh data progres dan riwayat belajar disimpan secara lokal pada *browser* pengguna melalui `localStorage`. Hal ini memiliki batasan:
1. **Tidak Sinkron Antar Perangkat:** Jika pengguna login dari HP lalu pindah ke Laptop, progres mereka mulai dari nol.
2. **Kapasitas Terbatas:** Penyimpanan riwayat bergantung pada batas *storage* browser (~5MB).
3. **Rentan Terhapus:** Membersihkan *cache/data* browser akan menghapus seluruh pencapaian secara permanen.

## Risiko "Client-Side Progression Guard"

Penguncian level (Progression Guard) saat ini murni dikelola di sisi klien (browser). Hal ini berarti sistem rentan terhadap manipulasi teknis sederhana.
Seorang pengguna yang memahami *Developer Tools* dapat memodifikasi isi `localStorage` atau menginjeksikan skrip untuk membuka kunci level secara artifisial. Arsitektur ini cukup untuk fase MVP agar aplikasi berjalan cepat dan tanpa biaya server, namun **bukan** sebuah mekanisme *anti-cheat* berskala produksi.

## Cara Menjalankan Regression Test

Semua logika, komponen, dan UI telah dilapisi dengan pengujian otomatis (Unit Test & E2E via Puppeteer). Untuk menjalankan _Regression Gate_ secara penuh:

```bash
# Pastikan Anda berada di root direktori proyek dan dependensi ter-install
npm install puppeteer

# Eksekusi seluruh rangkaian pengujian (Validation, Unit, E2E)
node scratch/run_all_tests.js
```
*Laporan detail (`TEST_REPORT.md`) akan dihasilkan secara otomatis setelah pengujian selesai.*

## Prioritas Selanjutnya (Phase 1)

Untuk mengatasi batasan arsitektur di atas, pengembangan selanjutnya akan bergeser ke ranah P1:
1. **Backend & Integrasi API:** Menyimpan *state* dan riwayat pengguna di *database* terpusat.
2. **Sistem Autentikasi (Auth):** Fitur registrasi dan login (mis. Google OAuth) untuk membedakan profil pengguna dan memungkinkan sinkronisasi _multi-device_.
3. **CMS (Content Management System):** Portal *admin* berbasis antarmuka untuk menambah, mengedit, dan menghapus soal dari *database* alih-alih melalui *file* JSON statis.
