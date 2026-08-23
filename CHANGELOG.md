# Changelog

## [Unreleased]
### Added
- **Diagnostic Test (Placement Test):**
  - Mengujikan 15 soal secara acak yang diambil per topik unik (Grammar, Vocabulary, Reading) tanpa timer (mode khusus).
  - Menyediakan rekomendasi level awal secara presisi berbasis akurasi (0-39%: Lv1, 40-59%: Lv3, 60-74%: Lv6, 75-89%: Lv10, 90-100%: Lv15).
  - Menyimpan metrik tes (completedAt, accuracy, weakTopics) ke localStorage.
- **Learning Path:**
  - Status *locked*, *available*, *in-progress*, *completed*, dan *mastered* terintegrasi ke dalam kartu level.
  - Opsi *Ulangi Placement Test* pada beranda bila user sudah melewati orientasi.

### Changed
- Threshold kelulusan level (PASS) diperketat dari 60% menjadi 70%.
- Navigasi terkunci (locked logic) menggunakan evaluasi hasil *Diagnostic Test* agar user dapat langsung meloncat ke level yang direkomendasikan.

### Ditambahkan
- Dashboard Progres Pelajar (P0-E) membaca data dari localStorage.
- Insight Topik Lemah dan Kuat dengan pure functions.
- Penanganan data localStorage terpisah untuk Practice, Timed Quiz, dan Diagnostic.
- Perbaikan overflow UI Mobile dari akar CSS.
- Skema Data DATA_SCHEMA.md untuk kontrak integritas data attempt.
