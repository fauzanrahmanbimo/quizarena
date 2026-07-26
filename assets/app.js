/* ================= QuizArena — game logic (mode 10 level) ================= */
(function () {
  "use strict";
  const CONFIG = window.QUIZ || { title: "Quiz", description: "", timePerQuestion: 20, levels: [] };
  const LEVELS = CONFIG.levels || [];
  const KEYS = ["A", "B", "C", "D"];
  const COLORS = ["var(--a0)", "var(--a1)", "var(--a2)", "var(--a3)"];
  const APP_KEY = "quizarena_" + slug(CONFIG.title);

  // ---- State ----
  let currentLevel = null;          // index level yang dimainkan
  let questions = [];               // 30 soal sesi ini (sudah diacak)
  let idx = 0, score = 0, correct = 0, streak = 0, maxStreak = 0;
  let timeLeft = CONFIG.timePerQuestion, timer = null, answered = false;
  let history = [];

  // ---- Elements ----
  const $ = (id) => document.getElementById(id);
  const screens = {
    home: $("screen-home"),
    levels: $("screen-levels"),
    quiz: $("screen-quiz"),
    result: $("screen-result"),
  };

  // ---- Init home ----
  $("quiz-title").textContent = CONFIG.title;
  $("quiz-desc").textContent = CONFIG.description;
  document.title = CONFIG.title;
  $("meta-count").textContent = LEVELS.length;
  $("meta-qtotal").textContent = LEVELS.reduce((s, l) => s + l.questions.length, 0);
  $("meta-time").textContent = CONFIG.timePerQuestion + "s";

  $("btn-start").addEventListener("click", goToLevels);
  $("player-name").addEventListener("keydown", (e) => { if (e.key === "Enter") goToLevels(); });
  $("btn-back-home").addEventListener("click", () => show("home"));
  $("btn-retry").addEventListener("click", () => { if (currentLevel != null) startLevel(currentLevel); });
  $("btn-levels").addEventListener("click", goToLevels);
  $("btn-review").addEventListener("click", toggleReview);
  $("btn-quit").addEventListener("click", () => { clearInterval(timer); goToLevels(); });

  // ---- Level select ----
  function goToLevels() {
    renderLevels();
    show("levels");
  }

  function renderLevels() {
    const name = ($("player-name").value || "").trim();
    $("levels-greeting").textContent = name ? `Halo, ${name}! Pilih levelmu 👇` : "Pilih level yang ingin kamu mainkan 👇";
    const grid = $("levels-grid");
    grid.innerHTML = "";
    LEVELS.forEach((lv, i) => {
      const best = getBest(lv.level);
      const card = document.createElement("button");
      card.className = "level-card";
      card.innerHTML =
        `<span class="level-top"><span class="level-num">Level ${lv.level}</span><span class="level-emoji">${lv.emoji || "🎯"}</span></span>` +
        `<span class="level-name">${esc(lv.name)}</span>` +
        `<span class="level-desc">${esc(lv.desc || "")}</span>` +
        `<span class="level-foot"><span class="level-diff">${esc(lv.difficulty)}</span><span class="level-best">${best > 0 ? "⭐ " + best : lv.questions.length + " soal"}</span></span>`;
      card.addEventListener("click", () => startLevel(i));
      grid.appendChild(card);
    });
  }

  // ---- Quiz flow ----
  function buildSession(level) {
    let pool = level.questions.map((q) => ({ ...q, options: [...q.options] }));
    if (CONFIG.shuffle) {
      shuffle(pool);
      pool = pool.map((q) => {
        const paired = q.options.map((opt, i) => ({ opt, correct: i === q.answer }));
        shuffle(paired);
        return { ...q, options: paired.map((p) => p.opt), answer: paired.findIndex((p) => p.correct) };
      });
    }
    return pool;
  }

  function startLevel(i) {
    currentLevel = i;
    const level = LEVELS[i];
    questions = buildSession(level);
    idx = 0; score = 0; correct = 0; streak = 0; maxStreak = 0; history = [];
    $("score-live").textContent = "0";
    $("quiz-level-tag").textContent = `Level ${level.level} · ${level.difficulty}`;
    show("quiz");
    renderQuestion();
  }

  function renderQuestion() {
    answered = false;
    const q = questions[idx];
    $("progress-label").innerHTML = `Soal <b>${idx + 1}</b> / ${questions.length}`;
    $("streak-pill").textContent = `🔥 ${streak}`;
    $("progress-fill").style.width = ((idx) / questions.length) * 100 + "%";
    $("question-tag").textContent = q.category || "Pilihan Ganda";
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
    timeLeft = CONFIG.timePerQuestion;
    updateTimerUI();
    timer = setInterval(() => {
      timeLeft--;
      updateTimerUI();
      if (timeLeft <= 0) { clearInterval(timer); if (!answered) lockOut(); }
    }, 1000);
  }

  function updateTimerUI() {
    const pct = (timeLeft / CONFIG.timePerQuestion) * 100;
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
    const q = questions[idx];
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
      const timeBonus = Math.round((timeLeft / CONFIG.timePerQuestion) * 50);
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

    setTimeout(next, 1100);
  }

  function lockOut() {
    answered = true;
    const q = questions[idx];
    [...document.querySelectorAll(".answer")].forEach((b, bi) => {
      b.classList.add("locked");
      if (bi === q.answer) b.classList.add("correct"); else b.classList.add("dim");
    });
    streak = 0;
    $("streak-pill").textContent = `🔥 0`;
    history.push({ q: q.q, chosen: -1, answer: q.answer, options: q.options, explain: q.explain, correct: false });
    setTimeout(next, 1100);
  }

  function next() {
    idx++;
    if (idx >= questions.length) finish();
    else renderQuestion();
  }

  function finish() {
    $("progress-fill").style.width = "100%";
    const level = LEVELS[currentLevel];
    const total = questions.length;
    const acc = total ? Math.round((correct / total) * 100) : 0;
    $("result-score").textContent = score;
    $("stat-correct").textContent = correct;
    $("stat-wrong").textContent = total - correct;
    $("stat-acc").textContent = acc + "%";
    $("stat-streak").textContent = maxStreak;

    const name = ($("player-name").value || "").trim();
    let emoji = "🎉", title = "Kerja bagus!", sub = "Kamu menyelesaikan level ini.";
    if (acc === 100) { emoji = "🏆"; title = "Sempurna!"; sub = "Semua jawaban benar. Luar biasa!"; }
    else if (acc >= 70) { emoji = "🌟"; title = "Hebat!"; sub = "Skor kamu sangat bagus."; }
    else if (acc >= 40) { emoji = "💪"; title = "Lumayan!"; sub = "Terus berlatih, kamu pasti bisa lebih baik."; }
    else { emoji = "🌱"; title = "Tetap semangat!"; sub = "Coba lagi untuk meningkatkan skormu."; }
    const isBest = score > getBest(level.level);
    $("result-emoji").textContent = emoji;
    $("result-title").textContent = name ? `${title} ${name}` : title;
    $("result-sub").textContent = `Level ${level.level} · ${level.name}. ${sub}` + (isBest ? " 🎊 Rekor baru!" : "");

    saveBest(level.level, score);
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
  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
  function bestKey(level) { return APP_KEY + "_best_L" + level; }
  function getBest(level) { return Number(localStorage.getItem(bestKey(level)) || 0); }
  function saveBest(level, s) { if (s > getBest(level)) localStorage.setItem(bestKey(level), String(s)); }
  function slug(s) { return String(s).toLowerCase().replace(/[^a-z0-9]+/g, "_"); }
  function esc(s) { const d = document.createElement("div"); d.textContent = s == null ? "" : s; return d.innerHTML; }
})();
