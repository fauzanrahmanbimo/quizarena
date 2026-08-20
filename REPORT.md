# Laporan Pengembangan: Sistem Bank Soal Dinamis (Revisi QA)

## Tujuan Tugas
Memperbaiki mekanisme Fallback UI saat gagal fetch dan menyempurnakan parsing serta validasi CSV pada fitur impor Bank Soal.

## Informasi Git
- **Branch:** feature/dynamic-question-bank
- **Commit Hash Terbaru:** [akan diisi setelah commit]
- **URL Pull Request:** https://github.com/fauzanrahmanbimo/quizarena/pull/4

## Lingkungan & Deployment
- **URL Preview Vercel:** [akan muncul di komentar PR]

## Daftar File yang Berubah
- \index.html\ - Revisi Fallback UI, penambahan overlay error, dan penulisan ulang parser CSV yang sesuai standar 9 kolom dan memvalidasi tipe/range secara ketat.
- \REPORT.md\ - Pembaruan laporan sesuai format QA.

## Ringkasan Perubahan Perilaku Aplikasi
- Jika questions/default.json atau level_meta.json gagal dimuat, aplikasi akan menampilkan layar peringatan khusus berwarna merah di tengah layar dengan pesan "Gagal memuat bank soal..." dan sebuah tombol "Coba Lagi". Aplikasi berhenti (halt) dengan aman dan tidak akan menampilkan array kosong.
- Import CSV sekarang mendukung kolom spesifik: option1, option2, option3, option4.
- Validasi CSV otomatis menolak baris jika jumlah kolom kurang dari 9, jika ada opsi yang kosong, atau jika correctIndex berada di luar range 0-3 (misal: 5 atau -1). Ringkasan impor menampilkan detail yang ditolak.

## Contoh Format CSV yang Didukung
\\\csv
category,difficulty,question,option1,option2,option3,option4,correctIndex,explanation
Matematika,easy,Berapa 2+2?,2,3,4,5,0,Penjumlahan dasar.
Logika,medium,Jika A=B dan B=C maka?,A=C,A!=C,B!=C,C!=A,0,Silogisme deduktif.
\\\

## Pengujian Tambahan
1. **Validasi CSV:** 
   - Diuji CSV valid -> Sukses terimpor utuh.
   - Diuji baris dengan correctIndex = 5 -> Ditolak (correctIndex (5) tidak valid).
   - Diuji baris dengan correctIndex = -1 -> Ditolak (correctIndex (-1) tidak valid).
   - Diuji baris dengan 3 opsi (option4 kosong) -> Ditolak (Opsi jawaban ada yang kosong).
   - Diuji baris dengan kurang dari 9 kolom -> Ditolak (Kolom kurang dari 9).
2. **Fetch Error Fallback:**
   - Direktori questions/default.json di-rename (simulasi gagal load). 
   - UI sukses memunculkan pesan error "Gagal memuat bank soal. Pastikan file questions/default.json ada dan server dapat diakses."
   - Ketika direname kembali, klik tombol "Coba Lagi" mereload aplikasi, kuis dapat dijalankan secara normal.

## Keterbatasan & Risiko
- Proses parse string CSV menggunakan split regex buatan sendiri (tanpa dependensi luar) masih bersifat *basic*. Jika string explanation memuat koma bercampur kutip dengan format sangat kompleks (nested quotes), parsing mungkin terganggu.

