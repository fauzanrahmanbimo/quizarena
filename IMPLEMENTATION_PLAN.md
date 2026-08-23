# Rencana Implementasi: Transformasi QuizArena menjadi Learning Platform

## Ringkasan Eksekutif
Transformasi akan mengubah alur QuizArena dari game kuis murni menjadi platform edukasi yang terstruktur dengan *Placement Test*, *Learning Path* (Peta Belajar), dan analisis diagnostik nyata setelah tes. Refaktor akan dilakukan menggunakan stack Vanilla JS saat ini tanpa merusak fitur lama, secara inkremental.

---

## P0: Core Learning Experience (Wajib Selesai Sekarang)
Fokus pada alur belajar inti, pemisahan layar, dan data dasar untuk edukasi.

1. **A. Onboarding & Placement Test (Diagnostic)**
   - **Tugas:** Menambahkan layar onboarding baru bagi pengguna yang belum memiliki data (`localStorage` kosong). Pengguna disodorkan 15 soal acak mewakili level 1-30. 
   - **Output:** Skor memetakan rekomendasi awal (misal: "Kamu direkomendasikan mulai dari Level 10").
   - **File yang berubah:** `index.html` (UI Onboarding, fungsi `startDiagnostic()`, `finishDiagnostic()`).
   
2. **B. Learning Path UI & Syarat Kelulusan**
   - **Tugas:** Merombak grid level menjadi representasi peta perjalanan (Path). Menambahkan logika *Lock/Unlock* ketat (Lulus = >=70% Benar). 
   - **File yang berubah:** `index.html` (Fungsi `renderLevels()`, `isUnlocked()`, `getBest()`). Tambahkan status *locked*, *available*, *completed*.
   
3. **C. Quiz Engine Solid (Anti-Cheat & Timer Flexible)**
   - **Tugas:** Randomisasi soal dan opsi setiap kuis ( Fisher-Yates shuffle pada `options` dengan melacak `correctIndex`). Fitur *Pause Timer* ketika tab tidak fokus (Page Visibility API).
   - **File yang berubah:** `index.html` (Fungsi `shuffleSession()`, `grade()`, `startLevel()`).
   
4. **D. Evaluasi dan Remedial (Result Screen Enhancements)**
   - **Tugas:** Merombak layar Selesai agar menampilkan "Jawaban Kamu vs Jawaban Benar" langsung, beserta pembahasan/penjelasan dari setiap soal yang salah, sebelum tombol "Level Berikutnya".
   - **File yang berubah:** `index.html` (Fungsi `finish()`, rendering elemen DOM `#review-screen`).

5. **E. Dashboard Progres**
   - **Tugas:** Mengolah data `quizarena_history` untuk menampilkan metrik nyata: Akurasi Rata-rata, Topik Terkuat, Topik Terlemah, Total XP.
   - **File yang berubah:** `index.html` (Modifikasi section Profil menjadi Dashboard Progres).

---

## P1: Sinkronisasi Backend & Data Lanjutan
*(Dikerjakan setelah P0 berjalan lancar)*
1. Migrasi status progres dan riwayat *attempt* dari `localStorage` murni ke MySQL via REST API.
2. Sinkronisasi data multi-device (Login dan Load Progress).
3. CMS (Admin Panel) untuk Content Creator guna memodifikasi format soal.
4. Leaderboard global yang dikategorikan per level/kelas.

---

## P2: Advanced Features & Gamification
*(Roadmap Masa Depan)*
1. Mode Daily Challenge.
2. Mode VS Real-time menggunakan WebSockets (Socket.io).
3. PWA (Progressive Web App) dengan offline-cache (Service Workers penuh).
4. Verifikasi Sertifikat berbasis QR Code.

---

## Metode Pelaksanaan P0
Saya akan mulai mengimplementasikan komponen P0 satu per satu langsung ke `index.html`. Saya akan memulai dari **A. Onboarding & Placement Test** dan **B. Learning Path UI**, kemudian melapor dengan rincian perubahannya.
