/* =============================================================
   DATA KUIS — Edit bagian ini untuk membuat kuis kamu sendiri.
   -------------------------------------------------------------
   - title       : judul kuis (tampil di halaman depan)
   - description : deskripsi singkat
   - timePerQuestion : waktu per soal (detik)
   - shuffle     : true = soal & pilihan diacak tiap main
   - pickCount   : berapa soal diambil per sesi (0 = semua)
   - questions[] :
       q        -> teks pertanyaan
       category -> label kategori (tampil sebagai tag, opsional)
       options  -> daftar jawaban (2-4 pilihan)
       answer   -> index jawaban benar (mulai dari 0)
       explain  -> penjelasan singkat (opsional, tampil di pembahasan)
   ============================================================= */
window.QUIZ = {
  title: "Quiz Bahasa Inggris Dasar",
  description: "Kuis interaktif dasar Bahasa Inggris — sapaan, kosakata, grammar, dan ungkapan sehari-hari.",
  timePerQuestion: 15,
  shuffle: true,
  pickCount: 10,
  questions: [
    {
      q: "Apa yang kita ucapkan saat bertemu seseorang pada jam 8 pagi?",
      category: "Daily Talk",
      options: ["Good afternoon", "Good evening", "Good morning", "Hello"],
      answer: 2,
      explain: "Pagi hari (sebelum jam 12 siang) menggunakan 'Good morning'."
    },
    {
      q: "Sapaan yang tepat digunakan pada jam 3 sore adalah…",
      category: "Daily Talk",
      options: ["Good night", "Good morning", "Good evening", "Good afternoon"],
      answer: 3,
      explain: "Siang hingga sore (12 siang - 6 sore) memakai 'Good afternoon'."
    },
    {
      q: "Jika kita berpisah dengan seseorang, kita mengucapkan…",
      category: "Daily Talk",
      options: ["Hi", "Goodbye", "How are you", "Good morning"],
      answer: 1,
      explain: "'Goodbye' digunakan ketika berpisah atau mengakhiri percakapan."
    },
    {
      q: "Bahasa Inggris dari \"Apa kabar?\" adalah…",
      category: "Daily Talk",
      options: ["Who are you?", "How are you?", "Where are you?", "What is this?"],
      answer: 1,
      explain: "'How are you?' berarti menanyakan kabar seseorang."
    },
    {
      q: "Kata 'Thank you' dalam Bahasa Indonesia berarti…",
      category: "Vocabulary",
      options: ["Maaf", "Tolong", "Terima kasih", "Sama-sama"],
      answer: 2,
      explain: "'Thank you' = Terima kasih."
    },
    {
      q: "Untuk meminta maaf, kita mengucapkan…",
      category: "Daily Talk",
      options: ["Sorry", "Please", "Welcome", "Thanks"],
      answer: 0,
      explain: "'Sorry' digunakan untuk meminta maaf."
    },
    {
      q: "Lawan kata dari 'big' adalah…",
      category: "Vocabulary",
      options: ["Tall", "Small", "Long", "Wide"],
      answer: 1,
      explain: "'Big' (besar) lawannya 'small' (kecil)."
    },
    {
      q: "Angka 'seven' dalam Bahasa Indonesia adalah…",
      category: "Vocabulary",
      options: ["Enam", "Delapan", "Tujuh", "Sembilan"],
      answer: 2,
      explain: "'Seven' = tujuh."
    },
    {
      q: "Warna 'blue' artinya…",
      category: "Vocabulary",
      options: ["Merah", "Biru", "Hijau", "Kuning"],
      answer: 1,
      explain: "'Blue' = biru."
    },
    {
      q: "Kalimat sopan untuk meminta bantuan diawali dengan…",
      category: "Daily Talk",
      options: ["No", "Stop", "Please", "Never"],
      answer: 2,
      explain: "'Please' membuat permintaan menjadi lebih sopan."
    },
    {
      q: "She ___ a teacher.",
      category: "Grammar",
      options: ["am", "is", "are", "be"],
      answer: 1,
      explain: "Subjek 'she' memakai 'is' (to be untuk orang ketiga tunggal)."
    },
    {
      q: "Bentuk jamak (plural) dari 'child' adalah…",
      category: "Grammar",
      options: ["childs", "childes", "children", "child"],
      answer: 2,
      explain: "'Child' bentuk jamaknya tidak beraturan: 'children'."
    },
    {
      q: "Yesterday I ___ to school.",
      category: "Tenses",
      options: ["go", "goes", "went", "going"],
      answer: 2,
      explain: "'Yesterday' menandakan lampau, jadi bentuk lampau 'go' adalah 'went'."
    },
    {
      q: "They ___ playing football now.",
      category: "Tenses",
      options: ["is", "am", "are", "be"],
      answer: 2,
      explain: "Present continuous dengan subjek 'they' memakai 'are' + V-ing."
    },
    {
      q: "This is ___ umbrella.",
      category: "Grammar",
      options: ["a", "an", "the", "some"],
      answer: 1,
      explain: "Kata 'umbrella' diawali bunyi vokal, jadi memakai 'an'."
    },
    {
      q: "Idiom 'break a leg' artinya…",
      category: "Idioms",
      options: ["Patah kaki", "Semoga sukses", "Lari cepat", "Jangan pergi"],
      answer: 1,
      explain: "'Break a leg' adalah ungkapan untuk 'semoga sukses / good luck'."
    },
    {
      q: "Hari setelah 'Monday' adalah…",
      category: "Vocabulary",
      options: ["Sunday", "Tuesday", "Friday", "Saturday"],
      answer: 1,
      explain: "Setelah Monday (Senin) adalah Tuesday (Selasa)."
    },
    {
      q: "Jawaban sopan untuk 'Thank you' adalah…",
      category: "Daily Talk",
      options: ["You're welcome", "Good night", "See you", "Excuse me"],
      answer: 0,
      explain: "'You're welcome' = sama-sama, respon umum untuk terima kasih."
    }
  ]
};
