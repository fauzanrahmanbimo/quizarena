# Laporan Pengembangan: Sistem Bank Soal Dinamis

## Tujuan Tugas
Membangun sistem Bank Soal Dinamis yang mencakup kategori, tingkat kesulitan, dan fitur impor soal dari file (JSON/CSV) tanpa mengubah alur inti aplikasi atau menggunakan backend.

## Informasi Git
- **Branch:** feature/dynamic-question-bank
- **Commit Hash Terbaru:** [akan disi nanti]
- **URL Pull Request:** [akan diisi setelah PR dibuat]

## Lingkungan & Deployment
- **URL Preview Vercel:** [akan diisi setelah PR dibuat]

## Daftar File yang Berubah
- \index.html\ - Refaktor logika untuk fetch soal dari file JSON eksternal, penambahan UI filter, UI impor, dan "Kelola Bank Soal".
- \questions/default.json\ (Baru) - Penyimpanan 600 soal bawaan dengan skema standar yang terlepas dari file utama.
- \level_meta.json\ (Baru) - Penyimpanan metadata level untuk menjaga kompatibilitas mundur pada mode "Latihan Per Level".

## Ringkasan Perubahan Perilaku Aplikasi
- Soal bawaan kini di-load secara asinkron (fetch) saat aplikasi pertama kali dibuka. 
- Ditambahkan menu "Custom Quiz" pada halaman level, memungkinkan pengguna menyaring soal berdasarkan Kategori dan Tingkat Kesulitan.
- Pengguna dapat mengimpor file CSV atau JSON melalui FileReader (diproses secara lokal di browser), divalidasi ketat, dan disimpan ke \localStorage\ (key: \quizarena_imported_questions\).
- Menu "Kelola Bank Soal" ditambahkan untuk melihat statistik soal bawaan vs. impor, serta memberikan keleluasaan menghapus soal hasil impor.

## Format Skema Soal (Contoh CSV Valid)
\\\csv
category,difficulty,question,option1,option2,option3,option4,correctIndex,explanation
Matematika,easy,Berapa 2+2?,2,3,4,5,2,Penjumlahan dasar.
Logika,medium,Jika A=B dan B=C maka?,A=C,A!=C,B!=C,C!=A,0,Silogisme deduktif.
\\\

## Pengujian
**Perintah Pengujian yang Dijalankan:**
\\\ash
N/A (Pengujian dilakukan sepenuhnya via DOM / Manual Browser)
\\\

**Hasil Pengujian:**
1. **Filter:** Memfilter "easy" menghasilkan quiz dengan semua soal level mudah. Memfilter kombinasi yang tidak ada memunculkan empty state yang ramah.
2. **Impor CSV & JSON:** Format CSV sesuai header standar berhasil dibaca dan diparsing. CSV dengan opsi jawaban kurang ditolak secara aman dengan pesan error dalam bahasa Indonesia. JSON array valid berhasil diparsing utuh.
3. **Gameplay:** Bermain kuis dengan soal impor berjalan lancar; timer, pemilihan, dan penghitungan skor berfungsi sempurna.
4. **Hapus Data:** Menghapus soal impor berfungsi seketika (DOM update & localStorage terhapus) tanpa mengganggu soal default.
5. **Responsivitas & Aksesibilitas:** Komponen select, input file, dan tabel dapat dinavigasikan menggunakan keyboard. Label terkait terikat melalui atribut \or\. Tampilan menyesuaikan ke kartu ringkas pada layar lebar 375px.

## Risiko dan Keterbatasan
- **Penyimpanan Lokal:** Saat ini soal hasil impor hanya disimpan di \localStorage\ per-browser. Ini berarti soal impor tidak akan tersinkronisasi antar perangkat atau browser. Ini adalah keterbatasan sementara sebelum adanya integrasi Backend / Firebase (sesuai batasan bahwa tidak boleh membuat backend baru di tugas ini).
- **Limitasi LocalStorage:** Quota penyimpanan lokal umumnya di 5MB, sehingga import masif (>5000 soal panjang) mungkin menabrak batas kapasitas browser.

## Langkah Pengujian Manual
1. Buka Vercel Preview URL.
2. Klik tombol "Custom Quiz" pada layar pilihan level.
3. Tes filter "Category" dan "Difficulty".
4. Klik "Kelola Bank Soal", coba upload file CSV dengan struktur yang sesuai contoh.
5. Jalankan Custom Quiz dari soal yang baru di-upload. Cek apakah perhitungan jawaban benar/salah berfungsi utuh.
6. Hapus soal via "Kelola Bank Soal" dan pastikan soal kembali lenyap.
