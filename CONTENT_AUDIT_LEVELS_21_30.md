# Audit Konten Level 21–30

## Metode Audit
Audit dilakukan dengan memadukan skrip Node.js terotomatisasi dan inspeksi heuristik. Kriteria yang diperiksa meliputi:
1. Setiap soal memiliki satu jawaban benar yang valid (`correctIndex` sesuai dengan indeks array `options`).
2. Tidak ada opsi jawaban ganda/duplikat dalam satu soal.
3. Grammar, ejaan, dan tanda baca bahasa Inggris dalam pertanyaan, memastikan setiap soal diakhiri dengan tanda baca yang tepat.
4. Keberadaan dan kesesuaian penjelasan (`explanation`), termasuk memastikan teks dalam bahasa Indonesia dan memuat konteks dari jawaban yang benar.
5. Kesesuaian topik (kategori) dengan level masing-masing.

## Ringkasan Per Level
| Level | Jumlah soal diperiksa | Soal diperbaiki | Temuan Utama |
|-------|-----------------------|-----------------|--------------|
| 21 | 30 | 6 | Beberapa soal tipe *Rearrange* tidak memiliki tanda titik (punctuation) di akhir kalimat. |
| 22 | 30 | 0 | Bersih. Seluruh `correctIndex`, ejaan, dan topik sesuai. |
| 23 | 30 | 0 | Bersih. Seluruh `correctIndex`, ejaan, dan topik sesuai. |
| 24 | 30 | 0 | Bersih. Seluruh `correctIndex`, ejaan, dan topik sesuai. |
| 25 | 30 | 0 | Bersih. Seluruh `correctIndex`, ejaan, dan topik sesuai. |
| 26 | 30 | 0 | Bersih. Seluruh `correctIndex`, ejaan, dan topik sesuai. |
| 27 | 30 | 0 | Bersih. Seluruh `correctIndex`, ejaan, dan topik sesuai. |
| 28 | 30 | 0 | Bersih. Seluruh `correctIndex`, ejaan, dan topik sesuai. |
| 29 | 30 | 0 | Bersih. Seluruh `correctIndex`, ejaan, dan topik sesuai. |
| 30 | 30 | 0 | Bersih. Seluruh `correctIndex`, ejaan, dan topik sesuai. |

## Daftar Perbaikan
- **default_L21_Q5**: Tanda baca hilang di akhir soal -> Ditambahkan tanda titik (.).
- **default_L21_Q10**: Tanda baca hilang di akhir soal -> Ditambahkan tanda titik (.).
- **default_L21_Q15**: Tanda baca hilang di akhir soal -> Ditambahkan tanda titik (.).
- **default_L21_Q20**: Tanda baca hilang di akhir soal -> Ditambahkan tanda titik (.).
- **default_L21_Q25**: Tanda baca hilang di akhir soal -> Ditambahkan tanda titik (.).
- **default_L21_Q30**: Tanda baca hilang di akhir soal -> Ditambahkan tanda titik (.).

## Kesimpulan
Dari **300** soal (Level 21 hingga 30) yang diaudit, ditemukan **6** soal yang membutuhkan perbaikan minor (hilangnya tanda baca pada akhir instruksi "Rearrange"). Seluruh 6 soal tersebut telah diperbaiki secara otomatis menggunakan skrip Node.js pada file `questions/default.json`. Struktur opsi jawaban, index jawaban yang benar, konsistensi topik per level, dan penjelasan berbahasa Indonesia seluruhnya valid dan berada dalam kondisi **Lulus Audit (Passed)**.
