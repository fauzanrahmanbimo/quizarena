/* =============================================================
   DATA KUIS — Edit bagian ini untuk membuat kuis kamu sendiri.
   -------------------------------------------------------------
   - title       : judul kuis (tampil di halaman depan)
   - description : deskripsi singkat
   - timePerQuestion : waktu per soal (detik)
   - questions[] :
       q       -> teks pertanyaan
       options -> daftar jawaban (2-4 pilihan)
       answer  -> index jawaban benar (mulai dari 0)
       explain -> penjelasan singkat (opsional, tampil di pembahasan)
   ============================================================= */
window.QUIZ = {
  title: "Quiz Bahasa Inggris Dasar",
  description: "Kuis interaktif dasar Bahasa Inggris — sapaan, kosakata, dan ungkapan sehari-hari.",
  timePerQuestion: 15,
  questions: [
    {
      q: "Apa yang kita ucapkan saat bertemu seseorang pada jam 8 pagi?",
      options: ["Good afternoon", "Good evening", "Good morning", "Hello"],
      answer: 2,
      explain: "Pagi hari (sebelum jam 12 siang) menggunakan 'Good morning'."
    },
    {
      q: "Sapaan yang tepat digunakan pada jam 3 sore adalah…",
      options: ["Good night", "Good morning", "Good evening", "Good afternoon"],
      answer: 3,
      explain: "Siang hingga sore (12 siang - 6 sore) memakai 'Good afternoon'."
    },
    {
      q: "Jika kita berpisah dengan seseorang, kita mengucapkan…",
      options: ["Hi", "Goodbye", "How are you", "Good morning"],
      answer: 1,
      explain: "'Goodbye' digunakan ketika berpisah atau mengakhiri percakapan."
    },
    {
      q: "Bahasa Inggris dari \"Apa kabar?\" adalah…",
      options: ["Who are you?", "How are you?", "Where are you?", "What is this?"],
      answer: 1,
      explain: "'How are you?' berarti menanyakan kabar seseorang."
    },
    {
      q: "Kata 'Thank you' dalam Bahasa Indonesia berarti…",
      options: ["Maaf", "Tolong", "Terima kasih", "Sama-sama"],
      answer: 2,
      explain: "'Thank you' = Terima kasih."
    },
    {
      q: "Untuk meminta maaf, kita mengucapkan…",
      options: ["Sorry", "Please", "Welcome", "Thanks"],
      answer: 0,
      explain: "'Sorry' digunakan untuk meminta maaf."
    },
    {
      q: "Lawan kata dari 'big' adalah…",
      options: ["Tall", "Small", "Long", "Wide"],
      answer: 1,
      explain: "'Big' (besar) lawannya 'small' (kecil)."
    },
    {
      q: "Angka 'seven' dalam Bahasa Indonesia adalah…",
      options: ["Enam", "Delapan", "Tujuh", "Sembilan"],
      answer: 2,
      explain: "'Seven' = tujuh."
    },
    {
      q: "Warna 'blue' artinya…",
      options: ["Merah", "Biru", "Hijau", "Kuning"],
      answer: 1,
      explain: "'Blue' = biru."
    },
    {
      q: "Kalimat sopan untuk meminta bantuan diawali dengan…",
      options: ["No", "Stop", "Please", "Never"],
      answer: 2,
      explain: "'Please' membuat permintaan menjadi lebih sopan."
    }
  ]
};
