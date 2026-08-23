# Skema Data QuizArena

Dokumen ini menjelaskan struktur data yang disimpan secara lokal di `localStorage` klien untuk fitur Dashboard dan Rekaman Upaya (Attempt Log). Skema ini bersifat ketat dan diproses melalui function pure untuk menjaga integritas.

## 1. `[APP]_fullAttemptsLog`

Menyimpan array dari objek sesi (attempt) yang telah diselesaikan.

```typescript
type AttemptLog = {
  attemptId: string;           // UUID atau timestamp unik
  attemptType: "diagnostic" | "practice" | "timed_quiz"; // Jenis upaya
  levelId: number | null;      // ID level (null jika diagnostic)
  startedAt: number;           // Unix timestamp ms
  completedAt: number;         // Unix timestamp ms
  totalQuestions: number;      // Total soal dalam sesi
  correctCount: number;        // Jumlah benar
  incorrectCount: number;      // Jumlah salah
  unansweredCount: number;     // Jumlah tak terjawab (timer habis/force close)
  accuracy: number;            // Persentase (0 - 100)
  averageAnswerTime: number;   // Rata-rata detik per soal
  passed: boolean | null;      // true jika lulus, false jika gagal, null jika diagnostic
  answers: AnswerDetail[];     // Rincian tiap soal yang dijawab (untuk insight topik)
}

type AnswerDetail = {
  questionId: string | number; // ID referensi soal
  topic: string;               // Topik / Kategori (e.g., "Grammar", "Vocabulary")
  selectedOptionId: number | null; 
  correctOptionId: number | null;
  isCorrect: boolean;
  timeSpent: number;           // Detik yang dihabiskan untuk soal ini
}
```

## 2. Kontrak Integritas Data (Dashboard)

1. **Pemisahan Statistik:** `attemptType === 'diagnostic'` TIDAK BOLEH dicampur ke dalam penghitungan rata-rata akurasi harian/latihan (`getDashboardStats`).
2. **Ambang Batas Topik:** Insight "Topik Lemah" dan "Topik Kuat" HANYA diekstrak dari riwayat reguler (`practice` atau `timed_quiz`) yang mengumpulkan _minimal 3 soal terjawab per topik_ (`getTopicPerformance`).
3. **Penanganan Kerusakan Data (Data Corruption):** Jika `JSON.parse` gagal atau terdapat skema usang tanpa tipe, sistem akan menggagalkan ke `practice` secara aman (`sanitizeAttempts`).
4. **Keamanan Injeksi (XSS):** Semua render ke dalam DOM dari data localStorage (seperti teks histori atau nama topik) MUTLAK menggunakan `.textContent` / manipulasi DOM murni (bukan `.innerHTML` string mentah).

## 3. Rekomendasi Level & CTA Dinamis
Dashboard memancarkan _Call-to-Action_ dinamis (`getRecommendedAction`) berdasarkan _event_ terakhir:
- **No Diagnostic:** CTA = _"Ambil Placement Test"_
- **Diagnostic, No Regular:** CTA = _"Mulai Level [Rekomen]"_
- **Failed Regular, Has Weak Topic:** CTA = _"Ulangi Topik Lemah"_
- **Failed Regular, No Topic Data:** CTA = _"Ulangi Level"_
- **Passed Regular:** CTA = _"Lanjutkan Level Berikutnya"_
