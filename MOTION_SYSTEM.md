# QuizArena Motion System

## Prinsip Dasar
Motion System QuizArena dirancang untuk memberikan pengalaman bermain kuis yang energetik dan premium tanpa mengorbankan performa, usability, dan accessibility.
- **Ringan & Cepat:** Transisi menggunakan durasi singkat (140-220ms).
- **Performa Tinggi:** Hanya menganimasikan `opacity` dan `transform` (GPU-accelerated). Tidak ada trigger layout/reflow yang mahal (seperti animating `width` atau `top`).
- **Aksesibel:** Menghormati OS-level `prefers-reduced-motion` untuk menghentikan seluruh partikel, *stagger*, dan *count-up* seketika.

## Custom Properties (Tokens)
Semua animasi menggunakan token CSS berikut (tersedia di `:root`):
- `--motion-fast`: 140ms
- `--motion-base`: 220ms
- `--motion-slow`: 420ms
- `--ease-out`: cubic-bezier(0.16, 1, 0.3, 1)
- `--ease-spring`: cubic-bezier(0.34, 1.56, 0.64, 1)

## Daftar Kelas Reusable
- `.motion-enter`: Fade-in dengan translateY (8px). Digunakan untuk perpindahan halaman (Screen transition).
- `.motion-enter--stagger`: Varian `.motion-enter` dengan `animation-delay` berurutan (misal: tombol opsi kuis, kartu dashboard).
- `.motion-pop`: Membesar singkat (1.05x) dengan pegas (spring) lalu kembali ke normal.
- `.motion-shake`: Bergerak kiri-kanan (4px) dengan cepat (300ms) untuk menandakan penolakan/kesalahan.
- `.motion-success`: Kombinasi warna hijau dan efek `.motion-pop`.
- `.motion-loading`: *Pulse* opacity 0.6 -> 1.
- `.motion-reveal`: Sama dengan `.motion-enter`, untuk mengungkap konten tersembunyi.
- `.shimmer-once`: Efek kilapan miring pada tombol CTA utama yang hanya jalan 1x.

## Trigger & Implementasi
1. **Screen Transition (Home/Page Change):**
   - Transisi fade dan geser 8px otomatis jalan via class `.screen.is-active`.
2. **Quiz Options:**
   - Masuk berurutan (stagger 40ms) via `.option-btn`.
   - Benar: `.motion-success` pada tombol + trigger partikel DOM ringan (max 12 node).
   - Salah: `.motion-shake` singkat pada opsi yang salah.
3. **Timer:**
   - Kurang dari 50%: class `.timer-warning` (pulse normal).
   - Kurang dari 25%: class `.timer-danger` (pulse cepat + warna bahaya).
4. **Result Screen:**
   - Angka Skor: Menggunakan JavaScript requestAnimationFrame *count-up* selama 700ms.
   - Lulus (Passed): Memanggil partikel konfeti via `window.fireConfetti(24)` & tombol *Next* mendapatkan `.btn-next-pulse`.

## Fallback Accessibility (Reduced Motion)
Apabila user mengaktifkan *Reduced Motion* di level sistem operasi:
- `@media (prefers-reduced-motion: reduce)` di dalam CSS akan membajak *semua* durasi animasi dan transisi menjadi `0.01ms`.
- Di level JavaScript, `window.prefersReducedMotion` (`matchMedia('(prefers-reduced-motion: reduce)')`) digunakan untuk:
  1. Langsung mengakhiri dan membersihkan DOM node untuk efek partikel konfeti.
  2. Langsung menampilkan nilai skor akhir pada komponen *count-up*.

## Panduan Menambah Motion Baru
1. JANGAN menambahkan library seperti GSAP atau Lottie.
2. JANGAN menggunakan animasi yang memicu repaint area besar (seperti scroll-jacking).
3. Jika menggunakan JavaScript untuk animasi DOM/Canvas, SELALU bungkus logic tersebut dengan pengecekan `if (window.prefersReducedMotion) return;`.
4. Hapus seluruh node/DOM sementara setelah animasi berakhir menggunakan *event listener* `animationend`.
