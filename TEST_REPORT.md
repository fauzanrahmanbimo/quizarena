# Laporan Pengujian (TEST_REPORT.md)

## Perintah Eksekusi
```bash
node scripts/validate-question-bank.js
node run_tests.js  # (Puppeteer UI Test Script)
```

## Output Ringkas

- **Test diagnostic 15 soal unik:** PASS (Soal berhasil dimuat, jumlah tepat 15, dan diacak secara unik lintas kategori)
- **Timer diagnostic hidden/nonaktif:** PASS (Atribut `hidden` = true pada `#timer` karena `diagnosticMode` mencegat `noTimer()`)
- **Batas rekomendasi 39/40/59/60/74/75/89/90:** PASS (Kalkulasi percabangan tervalidasi memberikan iterasi ke level 1, 3, 6, 10, atau 15 berdasarkan persentase)
- **CTA "Mulai dari Level Rekomendasi":** PASS (Tombol CTA sukses merender level target secara aman menggantikan navigasi bawaan)
- **CTA "Ulangi Placement Test":** PASS (Tombol dirender di layar beranda, membersihkan state kuis, dan memanggil fungsi `startDiagnostic()`)
- **User baru dan user lama:** PASS (User tanpa item `_onboarded` otomatis dialihkan ke placement test, user lama masuk ke dashboard)
- **Level 1 available, level target recommended, level sesudah target locked:** PASS (Diuji pada rekomendasi Level 6: Level 1-5 berlabel *Review/Optional*, Level 6 berlabel *Mulai di sini*, Level 7 *Terkunci*)
- **Pengujian viewport 360px dan desktop:** PASS (Komponen CSS Flex/Grid pada card level merespons viewport tanpa memutus label status maupun SVG)

*Catatan: Semua verifikasi UI DOM berjalan melalui Puppeteer dan inspeksi skrip manual di dalam repositori.*
