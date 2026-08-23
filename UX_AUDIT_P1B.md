# UX Audit - QuizArena P1B

## 1. Home / Onboarding
- **Masalah**: Layar awal membingungkan bagi pengguna baru, menumpuk opsi "Pilih Level", "1 Pemain/2 Pemain", dan input nama. CTA utama tidak berfokus pada Placement Test. Menampilkan "Mulai streak hari ini" meski data streak belum relevan.
- **Dampak Pengguna**: Cognitive overload; pengguna baru tidak tahu harus mulai dari mana.
- **Prioritas**: P0
- **Perbaikan Terpilih**: 
  - Sederhanakan state awal. Jika pengguna baru, tampilkan hero teks ringkas ("Uji kemampuan Bahasa Inggrismu!") dan 1 CTA utama: "Mulai Placement Test".
  - Jelaskan durasi (5-7 menit) dan jumlah soal (15 soal, tanpa timer).
  - Jika pengguna sudah pernah ikut diagnostic, ubah CTA utama menjadi "Mulai Level X" beserta alasan.
  - Sembunyikan pesan streak kosong. Tambahkan microcopy "Progres tersimpan di perangkat ini."
- **Perbaikan Tidak Dilakukan**: Integrasi login/akun (di luar scope P1-B).

## 2. Quiz Experience (Active & Pause State)
- **Masalah**: Progres tidak informatif ("Soal X dari Y" kurang terstruktur/aksesibel). Opsi jawaban kurang memiliki area klik mobile-friendly, state hover/focus kurang jelas. Tombol "Lanjut" bisa ditekan sebelum memilih jawaban. Pause overlay tidak menjebak focus atau memberikan penjelasan timer.
- **Dampak Pengguna**: Ketidaksengajaan klik jawaban pada layar kecil, kebingungan navigasi, aksesibilitas keyboard buruk.
- **Prioritas**: P0
- **Perbaikan Terpilih**: 
  - Tambahkan label progres eksplisit "Soal 4 dari 15" dan progress bar ber-aria.
  - Perbesar area klik (`padding`, `min-height`) untuk kartu opsi jawaban.
  - Nonaktifkan tombol "Lanjut" sampai pengguna memilih jawaban (kecuali mode yang mengizinkan skip).
  - Timer 30 detik terakhir diberi visual tambahan (ikon berdenyut/teks peringatan).
  - Pause overlay memberikan context ("Kuis Dijeda") dan focus trap ke CTA "Lanjutkan Kuis".
- **Perbaikan Tidak Dilakukan**: Mengubah algoritma timer atau skor.

## 3. Result dan Review
- **Masalah**: Hierarki hasil datar, CTA tidak menyesuaikan konteks lulus/gagal. Filter tab "Semua/Benar/Salah" pada review tidak terlihat status aktifnya. Topik lemah tidak ada empty state yang informatif.
- **Dampak Pengguna**: Kurang terarah untuk aksi selanjutnya (remedial atau lanjut level).
- **Prioritas**: P1
- **Perbaikan Terpilih**:
  - Judul hasil dinamis ("Bagus, kamu selesai!" vs "Yuk perkuat materi ini").
  - Insight top-level (Topik yang paling perlu diulang).
  - CTA Primer adaptif: "Lanjut ke Level Berikutnya" jika lulus, "Lihat Pembahasan" jika gagal.
  - Styling status filter review yang aktif.
  - Tampilkan status "Tidak dijawab" jika kosong.
- **Perbaikan Tidak Dilakukan**: Menambah latihan topik otomatis jika belum didukung backend.

## 4. Dashboard & Empty States
- **Masalah**: Metrik berisi "0" (nol) yang kurang memotivasi di state awal. Header dashboard tidak memberikan next action (CTA). Grafik riwayat pecah atau menyesatkan jika < 2 data point.
- **Dampak Pengguna**: Pengguna tidak merasa terpandu; visual grafik kosong membingungkan.
- **Prioritas**: P1
- **Perbaikan Terpilih**:
  - Tambahkan "Next Action" CTA di bagian atas Dashboard (dari getRecommendedAction()).
  - Sembunyikan chart riwayat dan ganti dengan Empty State informatif jika data < 2.
  - Hanya tunjukkan Topik Kuat / Perlu Diulang jika data relevan (>= 3 jawaban).
- **Perbaikan Tidak Dilakukan**: Sinkronisasi data cloud dashboard.

## 5. Accessibility dan Form UX
- **Masalah**: Fokus keyboard berpotensi tersangkut atau tidak terlihat, input error hanya mengandalkan warna. 
- **Dampak Pengguna**: Tidak ramah untuk pengguna keyboard atau screen reader.
- **Prioritas**: P1
- **Perbaikan Terpilih**:
  - Implementasi `:focus-visible` untuk indikator kontras.
  - Trap focus pada overlay/modal dan aria atribut yang valid.
  - Peringatan form dengan teks aria-live / alert.
- **Perbaikan Tidak Dilakukan**: Sertifikasi formal WCAG AA (tetapi prinsip utama diterapkan).

## 6. Responsive dan Performance
- **Masalah**: Risiko overflow horizontal di resolusi `360x800`.
- **Dampak Pengguna**: Terpotongnya UI pada layar kecil.
- **Prioritas**: P1
- **Perbaikan Terpilih**:
  - Ganti `overflow-x: hidden` yang memaksakan layout dengan penggunaan `max-width`, `min-width: 0`, dan `flex-wrap` yang benar.
- **Perbaikan Tidak Dilakukan**: Framework UI eksternal atau refactor styling besar-besaran di luar perbaikan esensial.
