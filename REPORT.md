# Laporan Pengembangan: Sistem Riwayat Nilai & Statistik

## Tujuan Tugas
Membangun sistem Riwayat Nilai berbasis \localStorage\ yang mencatat dan menampilkan daftar riwayat setiap sesi kuis beserta statistik dan performa analisis per kategori, tanpa mengubah fitur inti aplikasi.

## Informasi Git
- **Branch:** feature/score-history-localstorage
- **Commit Hash Terbaru:** [akan diisi oleh GitHub]
- **URL Pull Request:** [menunggu PR dibuat]

## Lingkungan & Deployment
- **URL Preview Vercel:** [otomatis via Vercel PR Bot]

## Daftar File yang Berubah
- \index.html\ - Diperbarui untuk mengintercept fungsi \grade()\ dan \inish()\, menambahkan UI halaman Riwayat Nilai (\#screen-history\) beserta modal detail sesinya, serta kalkulasi analitik performa.

## Skema Data Riwayat (Tersimpan di \quizarena_history\)
\\\json
{
  "id": "string unik",
  "timestamp": "2026-08-20T14:30:00.000Z",
  "mode": "level | custom",
  "levelId": "number atau null",
  "categoryFilter": "string atau 'all'",
  "difficultyFilter": "string atau 'all'",
  "totalQuestions": 30,
  "correctCount": 25,
  "wrongCount": 5,
  "skippedCount": 0,
  "accuracy": 83,
  "durationSeconds": 150,
  "questionDetails": [
    {
      "questionId": "string",
      "category": "string",
      "difficulty": "string",
      "userAnswerIndex": 2,
      "correctIndex": 2,
      "q": "Pertanyaan...",
      "you": "Jawaban User",
      "answer": "Jawaban Kunci",
      "explain": "Pembahasan",
      "correct": true
    }
  ]
}
\\\

## Ringkasan Perubahan Perilaku Aplikasi
- Di halaman "Pilih Level" (Beranda), ditambahkan satu tombol baru: "Riwayat Nilai & Statistik".
- Saat pengguna menyelesaikan sesi kuis apapun (mode Level atau Custom), waktu pengerjaan dan metrik lainnya disatukan lalu dipush ke Array \quizarena_history\ di \localStorage\. Data otomatis dibatasi pada 50 entri terakhir.
- Pengguna dapat melihat statistik komprehensif: Rata-rata akurasi, performa tiap kategori, serta "kategori terlemah" untuk memandu fokus belajar.
- Pengguna dapat menghapus 1 riwayat spesifik atau menghapus keseluruhan data sekaligus.

## Pengujian
**Perintah Pengujian yang Dijalankan:**
N/A (Sistem berbasis UI, diuji langsung di browser console)

**Hasil Pengujian Skenario (Manual):**
1. **Rekam Sesi Kuis:** Bermain 3 sesi (2 Level, 1 Custom dari file Impor). Semua sesi berhasil terekam utuh. Waktu hitung (durasi) presisi dengan *wall clock*.
2. **Lihat Riwayat & Modal Detail:** Tabel riwayat muncul merespons baik di layar desktop maupun layar mobile sempit. Menekan "Lihat Detail" membuka modal dengan list soal dan jawaban lengkap. Elemen dapat ditutup via \<dialog>.close()\.
3. **Statistik Kategori:** Statistik performa merangkum 	otal vs correct secara akurat pada level granularitas spesifik per-kategori soal. Jika akurasi anjlok di "Logika", UI otomatis menampilkan "Akurasi terendah: Logika".
4. **Hapus Riwayat:** Mengklik tombol hapus sukses membersihkan entri terkait di DOM dan \localStorage\.
5. **Handling Error Quota:** Logic penyimpanan telah dibalut \	ry...catch\, mencegah crash seandainya \localStorage\ disabilitas oleh konfigurasi browser pengguna.

## Risiko dan Keterbatasan
- **Penyimpanan Browser-Bound:** Semua data riwayat saat ini disimpan eksklusif pada \localStorage\ di *device/browser* pengguna masing-masing. Artinya, riwayat tidak akan tersinkronisasi jika pengguna berpindah dari Laptop ke HP, dan riwayat akan musnah secara otomatis jika pengguna membersihkan *cache/site data*. Sesuai spesifikasi tugas, ini merupakan trade-off wajib karena tidak ada *backend* server tersentralisasi.
- Kapasitas riwayat dibatasi hingga 50 sesi agar \localStorage\ tidak kepenuhan.
