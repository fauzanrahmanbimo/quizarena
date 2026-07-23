# ⚡ QuizArena — Kuis Interaktif (ala Wayground)

Web kuis interaktif yang ringan, cepat, dan elegan. Dibuat dengan **HTML + CSS + JavaScript murni** (tanpa framework), jadi 100% siap di-deploy ke **Vercel** tanpa proses build.

Fitur:
- 🎮 Alur permainan: layar mulai → soal → hasil
- ⏱️ Timer per soal + bar waktu berwarna
- 🔥 Sistem poin, bonus waktu, dan bonus streak
- 📊 Halaman hasil: skor, akurasi, streak maksimal
- 📝 Pembahasan jawaban (benar/salah + penjelasan)
- 🏆 Skor terbaik tersimpan otomatis (localStorage)
- 📱 Responsif (HP & desktop) + dukungan reduced-motion

---

## 📁 Struktur Folder

```
quizweb/
├─ index.html            # Halaman utama
├─ assets/
│  ├─ styles.css         # Semua styling
│  ├─ app.js             # Logika permainan
│  └─ questions.js       # 👈 EDIT DI SINI untuk ganti soal
├─ vercel.json           # Konfigurasi Vercel (opsional)
├─ package.json
└─ README.md
```

---

## ✏️ Cara Mengganti Soal

Buka `assets/questions.js` lalu ubah isinya. Contoh format:

```js
window.QUIZ = {
  title: "Judul Kuis Kamu",
  description: "Deskripsi singkat kuis.",
  timePerQuestion: 15,          // detik per soal
  questions: [
    {
      q: "Pertanyaan kamu di sini?",
      options: ["Pilihan A", "Pilihan B", "Pilihan C", "Pilihan D"],
      answer: 2,                 // index jawaban benar (0 = pertama)
      explain: "Penjelasan singkat (opsional)."
    }
  ]
};
```

> Tips: `options` boleh 2–4 pilihan. `answer` dihitung mulai dari **0**.

---

## 🖥️ Menjalankan di Komputer (Lokal)

Kamu cukup buka `index.html` di browser. Atau jalankan server lokal:

```bash
npx serve .
# lalu buka http://localhost:3000
```

---

## 🚀 Cara Deploy ke Vercel

### Cara 1 — Lewat GitHub (paling direkomendasikan)

1. **Buat repository GitHub baru**, misalnya `quizarena`.
2. Upload semua file folder ini ke repo tersebut:
   ```bash
   git init
   git add .
   git commit -m "QuizArena awal"
   git branch -M main
   git remote add origin https://github.com/USERNAME/quizarena.git
   git push -u origin main
   ```
3. Buka [vercel.com](https://vercel.com) → login (bisa pakai akun GitHub).
4. Klik **Add New… → Project**.
5. Pilih repo `quizarena` → klik **Import**.
6. Di bagian **Framework Preset**, pilih **Other** (ini situs statis, tidak perlu build).
   - Build Command: **(kosongkan)**
   - Output Directory: **(kosongkan / biarkan default)**
7. Klik **Deploy**. Tunggu beberapa detik.
8. Selesai! Kamu akan dapat URL seperti `https://quizarena.vercel.app` 🎉

Setiap kali kamu `git push`, Vercel otomatis update situsnya.

### Cara 2 — Lewat Vercel CLI (tanpa GitHub)

1. Install CLI:
   ```bash
   npm i -g vercel
   ```
2. Masuk ke folder proyek lalu jalankan:
   ```bash
   cd quizweb
   vercel
   ```
3. Ikuti pertanyaannya (login, nama proyek, dsb). Untuk deploy final:
   ```bash
   vercel --prod
   ```

### Cara 3 — Drag & Drop (paling cepat)

1. Kompres folder menjadi `.zip` (atau gunakan file zip yang sudah disediakan).
2. Buka [vercel.com/new](https://vercel.com/new).
3. Tarik folder proyek ke area upload, lalu **Deploy**.

---

## 🎨 Kustomisasi Tampilan

Warna & tema ada di bagian atas `assets/styles.css` (bagian `:root`). Ubah nilai variabel seperti `--primary`, `--bg`, dan warna jawaban `--a0`…`--a3` sesuai selera.

---

Dibuat dengan ⚡. Selamat berkarya, EL CO!
