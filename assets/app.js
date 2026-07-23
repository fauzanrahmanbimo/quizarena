/* ================= QuizArena — game logic ================= */
(function () {
  "use strict";
  const QUIZ = window.QUIZ || { title: "Quiz", description: "", timePerQuestion: 15, questions: [] };
  const KEYS = ["A", "B", "C", "D"];
  const COLORS = ["var(--a0)", "var(--a1)", "var(--a2)", "var(--a3)"];
  const BEST_KEY = "quizarena_best_" + slug(QUIZ.title);

  // ---- State ----
  let idx = 0, score = 0, correct = 0, streak = 0, maxStreak = 0;
  let timeLeft = QUIZ.timePerQuestion, timer = null, answered = false;
  let history = [];

  // ---- Elements ----
  const $ = (id) => document.getElementById(id);
  const screens = {
    home: $("screen-home"), quiz: $("screen-quiz"), result: $("screen-result"),
  };

  // ---- Init home ----
  $("quiz-title").textContent = QUIZ.title;
  $("quiz-desc").textContent = QUIZ.description;
  document.title = QUIZ.title + " — Kuis Interaktif";
  $("meta-count").textContent = QUIZ.questions.length;
  $("meta-time").textContent = QUIZ.timePerQuestion + "s";
  $("meta-best").textContent = getBest();

  $("btn-start").addEventListener("click", startQuiz);
  $("player-name").addEventListener("keydown", (e) => { if (e.key === "Enter") startQuiz(); });
  $("btn-retry").addEventListener("click", () => { show("home"); $("meta-best").textContent = getBest(); });
  $("btn-review").addEventListener("click", toggleReview);

  function startQuiz() {
    idx = 0; score = 0; correct = 0; streak = 0; maxStreak = 0; history = [];
    $("score-live").textContent = "0";
    show("quiz");
    renderQuestion();
  }

  function renderQuestion() {
    answered = false;
    const q = QUIZ.questions[idx];
    $("progress-label").textContent = `Soal ${idx + 1} / ${QUIZ.questions.length}`;
    $("streak-pill").textContent = `🔥 ${streak}`;
    $("progress-fill").style.width = ((idx) / QUIZ.questions.length) * 100 + "%";
    $("question-text").textContent = q.q;

    const wrap = $("answers");
    wrap.innerHTML = "";
    q.options.forEach((opt, i) => {
      const btn = document.createElement("button");
      btn.className = "answer";
      btn.style.setProperty("--c", COLORS[i % COLORS.length]);
      btn.setAttribute("data-key", KEYS[i]);
      btn.textContent = opt;
      btn.addEventListener("click", (e) => selectAnswer(i, e));
      wrap.appendChild(btn);
    });

    startTimer();
  }

  function startTimer() {
    clearInterval(timer);
    timeLeft = QUIZ.timePerQuestion;
    updateTimerUI();
    timer = setInterval(() => {
      timeLeft--;
      updateTimerUI();
      if (timeLeft <= 0) { clearInterval(timer); if (!answered) lockOut(); }
    }, 1000);
  }

  function updateTimerUI() {
    const pct = (timeLeft / QUIZ.timePerQuestion) * 100;
    const bar = $("timer-bar");
    bar.style.width = pct + "%";
    bar.classList.toggle("warn", pct <= 50 && pct > 25);
    bar.classList.toggle("danger", pct <= 25);
    $("timer-num").textContent = Math.max(0, timeLeft);
  }

  function selectAnswer(i, e) {
    if (answered) return;
    answered = true;
    clearInterval(timer);
    const q = QUIZ.questions[idx];
    const buttons = [...document.querySelectorAll(".answer")];
    buttons.forEach((b, bi) => {
      b.classList.add("locked");
      if (bi === q.answer) b.classList.add("correct");
      else if (bi === i) b.classList.add("wrong");
      else b.classList.add("dim");
    });

    const isCorrect = i === q.answer;
    let gained = 0;
    if (isCorrect) {
      correct++;
      streak++;
      maxStreak = Math.max(maxStreak, streak);
      const timeBonus = Math.round((timeLeft / QUIZ.timePerQuestion) * 50);
      const streakBonus = Math.min(streak - 1, 5) * 10;
      gained = 100 + timeBonus + streakBonus;
      score += gained;
      floatPoints(gained, e);
    } else {
      streak = 0;
    }
    $("score-live").textContent = score;
    $("streak-pill").textContent = `🔥 ${streak}`;
    history.push({ q: q.q, chosen: i, answer: q.answer, options: q.options, explain: q.explain, correct: isCorrect });

    setTimeout(next, 1150);
  }

  function lockOut() {
    answered = true;
    const q = QUIZ.questions[idx];
    [...document.querySelectorAll(".answer")].forEach((b, bi) => {
      b.classList.add("locked");
      if (bi === q.answer) b.classList.add("correct"); else b.classList.add("dim");
    });
    streak = 0;
    $("streak-pill").textContent = `🔥 0`;
    history.push({ q: q.q, chosen: -1, answer: q.answer, options: q.options, explain: q.explain, correct: false });
    setTimeout(next, 1150);
  }

  function next() {
    idx++;
    if (idx >= QUIZ.questions.length) finish();
    else renderQuestion();
  }

  function finish() {
    $("progress-fill").style.width = "100%";
    const total = QUIZ.questions.length;
    const acc = Math.round((correct / total) * 100);
    $("result-score").textContent = score;
    $("stat-correct").textContent = correct;
    $("stat-wrong").textContent = total - correct;
    $("stat-acc").textContent = acc + "%";
    $("stat-streak").textContent = maxStreak;

    let emoji = "🎉", title = "Kerja bagus!", sub = "Kamu menyelesaikan kuis.";
    if (acc === 100) { emoji = "🏆"; title = "Sempurna!"; sub = "Semua jawaban benar. Luar biasa!"; }
    else if (acc >= 70) { emoji = "🌟"; title = "Hebat!"; sub = "Skor kamu sangat bagus."; }
    else if (acc >= 40) { emoji = "💪"; title = "Lumayan!"; sub = "Terus berlatih, kamu pasti bisa lebih baik."; }
    else { emoji = "🌱"; title = "Tetap semangat!"; sub = "Coba lagi untuk meningkatkan skormu."; }
    $("result-emoji").textContent = emoji;
    $("result-title").textContent = title;
    $("result-sub").textContent = sub;

    saveBest(score);
    buildReview();
    $("review").hidden = true;
    $("btn-review").textContent = "Lihat Pembahasan";
    show("result");
  }

  function buildReview() {
    const wrap = $("review");
    wrap.innerHTML = "";
    history.forEach((h, n) => {
      const item = document.createElement("div");
      item.className = "review-item" + (h.correct ? "" : " is-wrong");
      const yourAns = h.chosen === -1 ? "(waktu habis)" : h.options[h.chosen];
      item.innerHTML =
        `<div class="review-q">${n + 1}. ${esc(h.q)}</div>` +
        `<div class="review-a ${h.correct ? "" : "wrong"}">Jawaban kamu: <strong>${esc(yourAns)}</strong></div>` +
        (h.correct ? "" : `<div class="review-a">Jawaban benar: <strong>${esc(h.options[h.answer])}</strong></div>`) +
        (h.explain ? `<div class="review-explain">💡 ${esc(h.explain)}</div>` : "");
      wrap.appendChild(item);
    });
  }

  function toggleReview() {
    const r = $("review");
    r.hidden = !r.hidden;
    $("btn-review").textContent = r.hidden ? "Lihat Pembahasan" : "Sembunyikan Pembahasan";
    if (!r.hidden) r.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function floatPoints(pts, e) {
    const el = document.createElement("div");
    el.className = "float-pts";
    el.textContent = "+" + pts;
    const x = e ? e.clientX : window.innerWidth / 2;
    const y = e ? e.clientY : window.innerHeight / 2;
    el.style.left = x + "px"; el.style.top = y + "px";
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1000);
  }

  // ---- helpers ----
  function show(name) {
    Object.values(screens).forEach((s) => s.classList.remove("is-active"));
    screens[name].classList.add("is-active");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function getBest() { return Number(localStorage.getItem(BEST_KEY) || 0); }
  function saveBest(s) { if (s > getBest()) localStorage.setItem(BEST_KEY, String(s)); }
  function slug(s) { return String(s).toLowerCase().replace(/[^a-z0-9]+/g, "_"); }
  function esc(s) { const d = document.createElement("div"); d.textContent = s == null ? "" : s; return d.innerHTML; }
})();
