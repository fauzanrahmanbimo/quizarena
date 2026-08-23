# Audit Repository QuizArena

## 1. Arsitektur & Teknologi
- **Frontend:** Vanilla HTML, CSS, dan JS yang tergabung dalam satu file raksasa (Monolith `index.html` sebesar ~134KB). Tidak ada build tools modern (Webpack/Vite) atau framework JS (React/Vue).
- **Backend:** Node.js, Express, MySQL (terletak di folder `backend/`). API melayani registrasi/login dan integrasi *hybrid* (fallback ke `questions/default.json`).
- **Data Sumber:** 900 soal Bahasa Inggris statis ada di `questions/default.json`. Metadata level ada di `level_meta.json`. State sesi pengguna disimpan murni dalam `localStorage`.
- **Styling:** CSS kustom *inline* dalam tag `<style>` yang mendukung mode gelap/terang.

## 2. Struktur Data Saat Ini
Data soal hanya memiliki properti: `id, category, difficulty, question, options, correctIndex, explanation, _originalLevel`. Model ini kurang memadai untuk fitur *learning platform* (seperti *diagnostic test*, *remedial*, atau *analytics* yang mendalam).

## 3. Temuan & Risiko (Technical Debt)
1. **Monolith Codebase:** 80KB kode JS bercampur logika UI, state, fetch API, DOM manipulation, dan timer dalam satu file. Ini akan sangat sulit dirawat bila fitur platform belajar bertambah kompleks (diagnostic test, learning path, dll).
2. **Ketergantungan Kuat pada `localStorage`:** Data progres mudah hilang atau dimanipulasi klien jika tidak segera disinkronkan ke backend secara andal. Backend MySQL belum benar-benar menyimpan progress *learning path* pengguna secara holistik.
3. **State Management Fragile:** Banyak variabel global (`currentLevel`, `idx`, `timer`, `acc`, dsb.) yang mudah bertabrakan ketika berpindah konteks dari *Quiz* ke *Diagnostic Test* atau *Remedial*.
4. **Desain Kuis vs Learning:** Saat ini kuis terasa seperti "game" (Timer 20 detik konstan, papan skor/streak yang kompetitif). Ini dapat membuat stres pemelajar bahasa yang butuh waktu membaca konteks (reading comprehension). Timer *rigid* bertentangan dengan pendekatan *learning*.
5. **Kurangnya Validasi State Sesi:** Pengguna dapat menekan refresh saat kuis dan data *attempt* tidak terekam akurat, yang berpotensi merusak akurasi diagnostik.

## 4. Bug & Masalah UI yang Teralami
1. Tidak ada rute (URL hash/History API) untuk setiap layar. Menekan tombol "Back" di browser akan langsung keluar dari web, bukan kembali ke layar sebelumnya.
2. Tidak ada error boundary bawaan di Vanilla JS. Jika satu baris JS error, keseluruhan UI macet (*blank / stuck*).

## 5. Rekomendasi Prioritas & Tindakan
- **Jangan menulis ulang UI ke React sekarang:** Walau *tech debt* tinggi, menulis ulang (`rewrite`) akan memakan waktu terlalu lama dan tidak menjawab mandat MVP P0 yang ditekankan. Kita akan me-refactor struktur Vanilla JS secara modular atau tetap menjaga kerapian di file terpisah jika memungkinkan, atau minimal memisahkan state/logika dari view rendering.
- **Transisi ke Learning Path:**
  - P0 difokuskan pada perbaikan skema Data Model JS menjadi representasi kuat dari *Course* (Module -> Lesson -> Quiz).
  - Integrasi Diagnostic Test (Pre-test) di depan sebelum membuka Level 1.
  - Hapus atau jadikan Timer opsional (buat sistem fleksibel).
  - Tampilkan ringkasan Pembahasan yang mengarahkan user belajar materi terkait (Remedial).


**Catatan MVP (P0):** Fitur penguncian level saat ini merupakan **client-side progression guard**. Karena aplikasi murni Vanilla JS + localStorage, user secara teoritis dapat memanipulasi progress via DevTools. Untuk rilis produksi sebenarnya, seluruh progress, skor, unlock, dan leaderboard wajib divalidasi dan disimpan di sisi server (API).