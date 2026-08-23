## P1-B: Frontend UX Upgrade
- [x] Bagian A: UX Audit (UX_AUDIT_P1B.md)
- [x] Bagian B: Onboarding & Home
- [x] Bagian C: Quiz Experience (Progress, Click targets, Pause Trap)
- [x] Bagian D: Result & Review (Hierarki, Remedial)
- [x] Bagian E: Dashboard (Actionable state)
- [x] Bagian F: Accessibility & Form UX
- [x] Bagian G: Responsive 360x800 & Performance
- [x] Bagian H: E2E UX Testing (UX_TEST_REPORT.md)


# Backlog Ide Masa Depan (P1 & P2)

## P1: Sinkronisasi Backend & Data Lanjutan
- [ ] **Autentikasi Penuh & Sinkronisasi Multi-Device:** Transisi progres \`localStorage\` ke backend MySQL (Tabel \`Users\`, \`Progress\`, \`QuizAttempt\`).
- [ ] **CMS Question Bank:** Panel admin untuk *Content Creator* membuat, mengedit, dan memvalidasi tipe soal tanpa menyentuh file JSON mentah.
- [ ] **Leaderboard Global/Kelas:** Papan skor yang dapat dikelompokkan (misal: "Top 10 Level 5 Minggu Ini").
- [ ] **Role Guru & Murid (Class Assignment):** Memungkinkan guru meng-assign level tertentu ke murid dengan parameter minimum kelulusan khusus.

## P2: Advanced Features & Gamification
- [ ] **Daily Challenge:** 5 soal tantangan harian (kosakata langka) dengan *xp multiplier*.
- [ ] **Mode VS Real-time:** Duel kompetitif antarpemain menggunakan WebSockets (Socket.io).
- [ ] **Mode Latihan Tanpa Timer:** Memfasilitasi belajar murni tanpa tekanan skor waktu.
- [ ] **Sertifikat dengan QR Code:** Link publik verifikasi penyelesaian level.
- [ ] **PWA & Offline Cache:** Memungkinkan aplikasi digunakan (mode review) tanpa koneksi internet yang stabil (Service Workers).
- [ ] **Mode Gelap Tingkat Lanjut:** Kontras dan estetika yang lebih responsif untuk membaca bacaan panjang (*Reading Comprehension*).
- [ ] **Analitik Kualitas Soal:** *Item Response Theory* (IRT) untuk melacak soal mana yang terlalu mudah/sulit berdasarkan riwayat jutaan *attempt* pengguna.

- [ ] **Server-Side Validation:** Migrasi client-side progression guard (penguncian level via JS) ke validasi API backend untuk mencegah manipulasi localStorage via DevTools.
- [ ] Integrasi persistensi API backend untuk sinkronisasi data antar perangkat.
- [ ] Sistem Autentikasi/Login untuk User Profile.
- [ ] Dashboard multi-device yang sinkron dengan API backend.
