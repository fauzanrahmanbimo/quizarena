# Laporan Pengembangan: Mode Latihan & Tinjau Jawaban

## Tujuan Tugas
Membangun Mode Latihan (dengan *instant feedback*) opsional, dan fitur *Review* (Tinjau Jawaban) pasca-kuis untuk memberikan wawasan lebih mendalam kepada pengguna, sekaligus memastikan integrasi lancar dengan Riwayat Nilai.

## Informasi Git
- **Branch:** feature/practice-mode-with-explanation
- **Commit Hash Terbaru:** [akan diisi setelah commit]
- **URL Pull Request:** [menunggu pembuatan PR]

## Lingkungan & Deployment
- **URL Preview Vercel:** [akan muncul di komentar PR]

## Daftar File yang Berubah
- \index.html\ - Diubah untuk menyisipkan *toggle* Mode Latihan, penyesuaian fungsi \grade()\, penambahan tombol & modal Tinjau Jawaban pasca-kuis, dan adaptasi modal Riwayat Nilai untuk skenario *missing explanation*.

## Deskripsi Mode Latihan (Cara Mengaktifkan)
Pengguna dapat mengaktifkan "Mode Latihan" menggunakan sebuah *checkbox* (*toggle*) **"Aktifkan Pembahasan Instan (Mode Latihan)"** yang kini tersedia secara mencolok di atas daftar Pilihan Level.
- Jika **Aktif:** Saat pengguna menjawab, warna hijau/merah (*correct/wrong*) muncul seketika bersama dengan kotak pembahasan (explanation box).
- Jika **Tidak Aktif:** Pengguna bermain murni tanpa *hint* atau *instant feedback*. Opsi yang dipilih hanya akan disorot warna primary (biru/ungu) standar, dan pengguna harus menekan tombol "Lanjut" tanpa mengetahui apakah jawaban mereka benar atau salah hingga kuis usai.

## Tinjau Jawaban (Post-Quiz Review)
Di layar hasil (*result screen*) setelah mensubmit seluruh jawaban, pengguna disediakan tombol baru **"Tinjau Jawaban"**. Tombol ini akan membuka sebuah *dialog modal* yang men-scroll riwayat sesi barusan:
- Memuat list setiap soal beserta kategori.
- Jawaban yang pengguna pilih ditandai (X/Centang).
- Kunci jawaban yang seharusnya.
- Blok *Pembahasan* lengkap. (Ditampilkan *"Pembahasan tidak tersedia"* jika kosong).

## Pengujian Skenario (Fase 5)
1. **Mode Latihan Aktif:** Dijalankan. Feedback instan berfungsi, blok *explain-box* tampil dan warna opsi berubah.
2. **Mode Latihan Nonaktif:** Dijalankan. Pengguna menjawab soal, opsi berubah menjadi tersorot warna solid standar. Tidak ada kotak penjelasan. Di akhir sesi skor terkalkulasi benar.
3. **Tinjau Jawaban (Post-Quiz):** Tampil tombol "Tinjau Jawaban". Modal berhasil terbuka via \showModal()\. Komponen ramah *screen-reader* (tombol X dan Escape).
4. **Missing Explanation:** Data dummy dimasukkan tanpa *field* \explanation\. Terbukti merender *"Pembahasan tidak tersedia."* alih-alih error atau kosong. Integrasi di History Modal juga diperbaiki agar konsisten menampilkan hal yang sama.
5. **Responsivitas & Keyboard:** Modal menggunakan \<dialog>\ HTML5 *native*, teruji penuh dijebak fokusnya pada keyboard (\Tab\, \Enter\, \Escape\) dan *scroll* internalnya tidak memecahkan antarmuka di layar ukuran 375px.
6. **Konsol Bersih:** Tidak ada error yang ditimbulkan pada inspektor. Alur kuis inti, fitur Bank Soal, dan penyimpanan riwayat (beserta *guard clause* sebelumnya) tetap steril.

## Keterbatasan & Risiko
- Teks *"Pembahasan tidak tersedia."* di- *hardcode* dalam UI bahasa Indonesia. Risiko keterbatasan akan ada jika di masa depan terdapat dukungan *multi-language*.
- Bergantung pada keberadaan properti \explain\ pada JSON soal.


### Catatan tentang Durasi
- **Distorsi Kalkulasi:** Nilai \durationSeconds\ pada mode latihan aktif mencakup waktu membaca pembahasan di setiap soal. Hal ini menyebabkan durasi yang terekam membengkak secara artifisial, sehingga metrik waktu antara sesi mode latihan aktif **tidak dapat dibandingkan secara langsung** dengan sesi mode ujian (nonaktif).
- **Rekomendasi Analitik Ke Depan:** Jika di masa depan sistem ini memerlukan pelaporan metrik kecepatan kuis yang murni (*pure speed metrics*), fitur *timer* harus diperbaiki secara arsitektural agar dijeda (*paused*) secara dinamis selama pengguna sedang membaca blok \explain-box\.
