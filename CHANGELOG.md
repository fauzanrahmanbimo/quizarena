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


## [v4.1.0-ux] - 2026-08-24
### Added
- Dynamic Onboarding CTA (Placement Test vs Start Level)
- Result and Remedial Contextual CTA
- Pause overlay with focus trap (\#pause-overlay\)

### Changed
- Dashboard layout prioritize actionable CTAs
- Responsive fix: Max-width instead of overflow-x hidden for 360x800 support
- Accessible Focus (\:focus-visible\) instead of hidden outlines

### Fixed
- Tab navigation on modal dialogs (Login & Register)
- Accessibility ARIA attributes on inputs and validation labels

