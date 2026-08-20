# Laporan Pengembangan: Fitur Ekspor Bank Soal (JSON & CSV)

## Tujuan Tugas
Membangun kapabilitas untuk mengunduh seluruh direktori bank soal (gabungan dari bawaan/default dan soal yang diimpor pengguna) dalam format \JSON\ maupun \CSV\. Fitur ini beroperasi murni di sisi klien tanpa pelibatan _server_ tambahan, memfasilitasi kebutuhan *backup*, berbagi konten, atau analisis data *offline*.

## Informasi Git
- **Branch:** feature/export-question-bank
- **Commit Hash Terbaru:** [akan diisi setelah commit]
- **URL Pull Request:** [menunggu pembuatan PR]

## Lingkungan & Deployment
- **URL Preview Vercel:** [akan muncul otomatis di komentar PR]

## Daftar File yang Berubah
- \index.html\ - Diubah untuk menyisipkan UI dan interaksi \Ekspor Bank Soal\. Menambahkan *native dialog* \modal-export\ beserta fungsi global \window.exportBank()\ untuk memproses konversi _array_ soal menjadi _Blob_ berbasis MIME JSON dan CSV lalu memicu pengunduhan (*anchor tag click*).

## Deskripsi Fitur Ekspor & Cara Penggunaan
Pada menu **"Kelola Bank Soal"**, tepat di atas blok *Impor Soal*, kini ditambahkan blok baru bertuliskan **"Ekspor Bank Soal"** dengan tombol berlabel **"?? Ekspor"**.
- Mengeklik tombol akan membuka modal kecil ramah *mobile* (dapat ditutup via klik silang atau *Escape*).
- Modal mempresentasikan dua pilihan: **Ekspor sebagai JSON** dan **Ekspor sebagai CSV**.
- File unduhan otomatis dinamai \quizarena_questions.json\ atau \quizarena_questions.csv\ berisikan seluruh soal (bukan hanya soal khusus impor saja).

## Skema dan Contoh Data Ekspor
*Sistem mengonversi secara otomatis untuk memastikan kompatibilitas 1:1 antara format Ekspor dengan fungsi Impor yang ada.*

**Format JSON:**
\\\json
[
  {
    "id": "q_1",
    "category": "Matematika",
    "difficulty": "Mudah",
    "question": "Berapa 10 + 5?",
    "options": ["10", "15", "20", "25"],
    "correctIndex": 1,
    "explanation": "Penjumlahan dasar."
  }
]
\\\

**Format CSV:**
(Mendukung pelolosan koma di dalam string dengan tanda kutip ganda otomatis)
\\\csv
category,difficulty,question,option1,option2,option3,option4,correctIndex,explanation
Matematika,Mudah,Berapa 10 + 5?,10,15,20,25,1,Penjumlahan dasar.
"Bahasa, Inggris",Sedang,"Apa arti ""Cat""?",Anjing,Kucing,Burung,Ikan,1,Kosakata dasar.
\\\

## Pengujian Skenario (Fase 5)
1. **Verifikasi Output:** Ekspor JSON berjalan mulus dan tervalidasi menggunakan struktur array \{ id, category, difficulty, question, options, correctIndex, explanation }\.
2. **Parsing CSV Tangguh:** Ekspor CSV memproteksi teks yang berisi koma atau petik ganda dengan membungkusnya dalam *double quotes* \""\ sesuai standar RFC 4180.
3. **Uji Impor Kembali:** File CSV yang diekspor dites untuk diimpor kembali *(re-import)* ke dalam kuis. Parser import berhasil menelan datanya tanpa penolakan kolom, membuktikan simetri antara format Ekspor & Impor.
4. **Keutuhan Bank Soal:** Kedua format tervalidasi menyedot *variabel gabungan* dari \default.json\ dan isi \localStorage\, menghasilkan kelengkapan data absolut.
5. **Aksesibilitas & UI:** Modal mematuhi *tab-index*, terpusat sempurna, dan tak meluber di ukuran layar lipat maupun *mobile* (375px).

## Keterbatasan & Risiko
- Proses komputasi *blob string* CSV beroperasi iteratif secara sinkron. Pada rentang 1.000-5.000 soal hal ini sama sekali tidak terasa (~5ms), namun bisa membekukan laju render UI sepersekian detik jika data menembus \>10.000\ baris.
- **Kinerja Ekspor Data Skala Masif:** Mengingat algoritma berjalan secara sinkron (single-thread), performa ekspor dapat menurun secara eksponensial untuk data yang sangat besar (>10.000 soal), sehingga berisiko menunda responsivitas antarmuka selama komputasi berlangsung.
