const fs = require("fs");
let html = fs.readFileSync("index.html", "utf8");

// Update Home Screen HTML
const homeReplacement = `<section class="screen screen--home is-active" id="screen-home">
  <div class="card card--hero">
    <span class="badge">?? Bahasa Inggris · 20 Level</span>
    <h1 class="hero-title" id="quiz-title">QuizArena</h1>
    <p class="hero-subtitle" id="quiz-desc">Tingkatkan Bahasa Inggrismu selangkah demi selangkah.</p>
    
    <div class="streak-chip" id="streak-home" hidden>??</div>
    
    <div id="home-dynamic-action" style="margin: 24px 0; padding: 16px; background: var(--bg-main); border-radius: 12px; border: 1px solid var(--border);">
       <!-- Injected via JS -->
    </div>
    
    <p style="font-size: 12px; color: var(--text-muted); margin-bottom: 16px;">Progres tersimpan di perangkat ini.</p>

    <div id="home-extra-settings" style="text-align: left;">
      <div class="field">
        <label for="player-name">Nama pemain</label>
        <input id="player-name" type="text" placeholder="Tulis namamu…" maxlength="24" autocomplete="off" />
      </div>
      <details style="margin-top:12px; font-size:14px;">
        <summary style="cursor:pointer; color:var(--text-muted); font-weight:600;">Pengaturan Mode (2 Pemain / Teks)</summary>
        <div class="field" id="field-p2" hidden style="margin-top:12px;">
          <label for="player-name-2">Nama pemain 2</label>
          <input id="player-name-2" type="text" placeholder="Nama lawan…" maxlength="24" autocomplete="off" />
        </div>
        <div class="seg" id="seg-players" style="margin-top:12px;">
          <button class="seg-btn is-on" data-players="1">?? 1 Pemain</button>
          <button class="seg-btn" data-players="2">?? 2 Pemain (VS)</button>
        </div>
        <div class="seg" id="seg-mode">
          <button class="seg-btn is-on" data-mode="mc">?? Pilihan Ganda</button>
          <button class="seg-btn" data-mode="type">?? Ketik Jawaban</button>
        </div>
      </details>
    </div>

    <div class="home-links" style="margin-top:24px; border-top:1px solid var(--border); padding-top:16px;">
      <button class="btn-text" id="btn-dashboard" style="margin-bottom:8px; font-weight:bold; color:var(--primary);">?? Dashboard Progres</button>
      <button class="btn-text" id="btn-board">?? Papan Skor Global</button>
    </div>
  </div>
</section>`;

html = html.replace(/<section class="screen screen--home is-active" id="screen-home">[\s\S]*?<\/section>/, homeReplacement);

const jsReplacement = `
  function updateHomeUI() {
    const isNew = !localStorage.getItem(APP + "_onboarded");
    const hasDiag = !!localStorage.getItem(APP + "_best_Diagnostic Test");
    const container = $("home-dynamic-action");
    
    const s = typeof getStreak === "function" ? getStreak() : 0;
    if(s > 0) {
       $("streak-home").textContent = "?? Streak " + s + " hari!";
       $("streak-home").hidden = false;
    } else {
       if ($("streak-home")) $("streak-home").hidden = true;
    }

    if (isNew && !hasDiag) {
      container.innerHTML = \`<h3 style="margin-bottom:8px;">Mulai Perjalananmu</h3>
        <p style="font-size:14px; color:var(--text-muted); margin-bottom:16px;">15 soal, tanpa timer, sekitar 5–7 menit untuk mengetahui kemampuan awalmu.</p>
        <button class="btn btn--primary btn--lg" id="btn-start-diag" style="width:100%">Mulai Placement Test <span class="btn-arrow">?</span></button>\`;
      $("btn-start-diag").addEventListener("click", () => { localStorage.setItem(APP + "_onboarded", "1"); startDiagnostic(); });
    } else if (hasDiag && (typeof getStats === "function" ? getStats().attempts < 2 : true)) {
      let rec = typeof getRecommendedLevel === "function" ? getRecommendedLevel() : 1;
      container.innerHTML = \`<h3 style="margin-bottom:8px;">Rekomendasi Level</h3>
        <p style="font-size:14px; color:var(--text-muted); margin-bottom:16px;">Level ini dipilih dari hasil placement test Anda.</p>
        <button class="btn btn--primary btn--lg" id="btn-start-rec" style="width:100%">Mulai Level \` + rec + \` <span class="btn-arrow">?</span></button>\`;
      $("btn-start-rec").addEventListener("click", () => { startLevel(rec); });
    } else {
      container.innerHTML = \`<h3 style="margin-bottom:8px;">Lanjutkan Belajar</h3>
        <button class="btn btn--primary btn--lg" id="btn-start-rec" style="width:100%; margin-bottom:8px;">Lanjut Level Berikutnya <span class="btn-arrow">?</span></button>
        <button class="btn btn--soft" id="btn-choose-level" style="width:100%">Pilih Level Lain</button>\`;
      $("btn-start-rec").addEventListener("click", () => { startLevel(typeof getRecommendedLevel === "function" ? getRecommendedLevel() : 1); });
      $("btn-choose-level").addEventListener("click", typeof goToLevels === "function" ? goToLevels : () => {});
    }
  }

  function handleStart() {
    // Old handleStart replaced, init is now handled via updateHomeUI
  }`;

html = html.replace(/function handleStart\(\) \{[\s\S]*?\}/, jsReplacement);

// Also need to inject updateHomeUI() call in the main window load or at the bottom.
// We can just append it before the end of the IIFE.
html = html.replace(/updateAuthUI\(\);/, "updateAuthUI();\n  updateHomeUI();");

fs.writeFileSync("index.html", html);
console.log("Done");
