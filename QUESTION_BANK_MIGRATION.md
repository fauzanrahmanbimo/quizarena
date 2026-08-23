# Question Bank Migration (Seed)

## Konteks & Source of Truth
Untuk menjalankan _Server-Side Validation_ (SSV) secara utuh, backend memerlukan salinan bank soal yang identik dengan klien. File `questions/default.json` menjadi sumber asali (Source of Truth) dengan 900 soal tervalidasi.

## Mapping & Stable Key
ID dari setiap soal di `questions/default.json` (seperti `1`, `2`, atau `default_L29_Q30`) dijamin stabil dan telah divalidasi tidak memiliki duplikat. Oleh karena itu, ID asal ini digunakan langsung sebagai kunci deterministik `question_key` pada tabel MySQL `questions`.

## Cara Migrasi / Seed
1. **Dry-Run (Simulasi):**
   ```bash
   node backend/scripts/seed-question-bank.js
   ```
   Skrip ini memvalidasi kelengkapan bidang (prompt, opsi, jawaban benar) untuk keseluruhan 900 soal tanpa menyentuh database.

2. **Apply (Tulis ke Database):**
   ```bash
   node backend/scripts/seed-question-bank.js --apply
   ```
   Akan melakukan _upsert_ level dan _upsert_ soal secara transaksional.

3. **Verifikasi Kesejajaran (Parity Check):**
   ```bash
   node backend/scripts/verify-question-bank-parity.js
   ```
   Memastikan jumlah tabel di DB benar-benar 900 dan kuncinya 100% selaras dengan JSON, tanpa duplikat atau *orphan records*.

## Risiko & Rollback
Jika terjadi kesalahan pada format JSON, transaksi `seed` otomatis digagalkan (_rollback_). `verify-question-bank-parity.js` menindaklanjuti dengan status _Exit 1_ jika kesejajaran tidak genap 100%, yang memblokir segala integrasi lebih lanjut.
