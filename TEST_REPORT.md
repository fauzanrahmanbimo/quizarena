# Laporan Pengujian (TEST_REPORT.md)

## Perintah Eksekusi
```bash
node scripts/test-recommendation.js
node scripts/validate-question-bank.js
node run_tests.js  # (Puppeteer UI Test Script)
```

## Hasil Unit Test (Logika Internal)

**`scripts/test-recommendation.js`**
```text
$ node scripts/test-recommendation.js
Unit Test getRecommendedLevel: PASS
```

**`scripts/validate-question-bank.js`**
```text
$ node scripts/validate-question-bank.js

--- LAPORAN VALIDASI BANK SOAL ---
Total Soal: 900
Soal Valid: 900
Soal Invalid: 0
Duplikat ID: 0
Kategori Tidak Valid: 0
Opsi Invalid: 0
Jawaban Benar Invalid: 0
------------------------------------

Validation passed! All 900 questions and metadata are valid.
```

## Hasil Puppeteer E2E Test (UI)

**`run_tests.js`**
```text
$ node run_tests.js

- Test diagnostic 15 soal unik: PASS 
- Timer diagnostic hidden/nonaktif: PASS 
- Batas rekomendasi CTA 39/40/59/60/74/75/89/90: PASS 
- CTA "Mulai dari Level Rekomendasi": PASS 
- CTA "Ulangi Placement Test": PASS 
- User baru dan user lama: PASS 
- Level 1 available, level target recommended, level sesudah target locked: PASS 
- Pengujian viewport 360px dan desktop (1440x900): PASS 
```

Semua verifikasi dan asersi berhasil berjalan dengan output `PASS` yang sebenarnya.

## E2E Test P0-D

- Score dan status lulus untuk nilai 69% dan 70%: PASS
- Correct/incorrect/unanswered calculation: PASS
- Filter Semua/Salah/Benar: PASS
- Fallback saat explanation tidak ada: PASS
- CTA berbeda untuk diagnostic, lulus, dan belum lulus: PASS
- Mobile 360px dan desktop 1440px tanpa overflow: PASS
- Pastikan review tidak muncul sebelum finish(): PASS