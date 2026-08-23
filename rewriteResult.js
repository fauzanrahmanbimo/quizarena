const fs = require("fs");
let html = fs.readFileSync("index.html", "utf8");

const ctaRegex = /\/\/ Dynamic CTAs[\s\S]{0,1000}afterFinish\(\);\n\}/;
const newCTAs = `// Dynamic CTAs
    const ctaWrap = $("dynamic-ctas");
    ctaWrap.innerHTML = "";
    
    // Result logic
    if (diagnosticMode) {
       $("result-title").textContent = "Diagnostic Selesai";
       $("result-status-badge").innerHTML = \`<span style="background:var(--primary); color:white; padding:4px 8px; border-radius:12px; font-size:12px;">Diagnostic Completed</span>\`;
       const diagState = JSON.parse(localStorage.getItem(APP + "_diagnostic"));
       ctaWrap.innerHTML += \`<button class="btn btn--primary" onclick="goToLevels(); setTimeout(()=>startLevel(\${diagState.recommendedLevel - 1}), 500)">Mulai Level Rekomendasi</button>\`;
       ctaWrap.innerHTML += \`<button class="btn btn--soft" onclick="goToLevels()">Kembali ke Home</button>\`;
    } else {
       if (isPassed) {
          $("result-title").textContent = "Bagus, kamu selesai!";
          $("result-status-badge").innerHTML = \`<span style="background:var(--success); color:white; padding:4px 8px; border-radius:12px; font-size:12px;">Passed</span>\`;
          
          if (currentLevel !== null && currentLevel + 1 < LEVELS.length) {
             ctaWrap.innerHTML += \`<button class="btn btn--primary" onclick="startLevel(\${currentLevel + 1})">Lanjut ke Level Berikutnya &rarr;</button>\`;
          } else {
             ctaWrap.innerHTML += \`<button class="btn btn--primary" onclick="goToLevels()">Kembali ke Learning Path</button>\`;
          }
          ctaWrap.innerHTML += \`<button class="btn btn--soft" onclick="toggleReview()">Lihat Pembahasan</button>\`;
       } else {
          $("result-title").textContent = "Yuk perkuat materi ini.";
          $("result-status-badge").innerHTML = \`<span style="background:var(--danger); color:white; padding:4px 8px; border-radius:12px; font-size:12px;">Needs Practice</span>\`;
          
          ctaWrap.innerHTML += \`<button class="btn btn--primary" onclick="toggleReview()">Lihat Pembahasan</button>\`;
          ctaWrap.innerHTML += \`<button class="btn btn--soft" onclick="startLevel(\${currentLevel})">Ulangi Level</button>\`;
          ctaWrap.innerHTML += \`<button class="btn btn--ghost" onclick="goToLevels()">Kembali ke Learning Path</button>\`;
       }
    }
    
    diagnosticMode = false;
    afterFinish();
}`;

if (ctaRegex.test(html)) { html = html.replace(ctaRegex, newCTAs); } else { console.log("ctaRegex not matched"); }

const reviewFilterLogic = `
  function filterReview(status) {
    const items = document.querySelectorAll(".rev-card");
    items.forEach(item => {
      const isCorrect = item.dataset.correct === "true";
      if (status === "all") item.style.display = "block";
      else if (status === "wrong" && !isCorrect) item.style.display = "block";
      else if (status === "correct" && isCorrect) item.style.display = "block";
      else item.style.display = "none";
    });
    document.querySelectorAll("#review > button").forEach(b => {
      b.classList.remove("btn--primary");
      b.classList.add("btn--soft");
    });
    if(status==="all") {
      $("tab-rev-all").classList.remove("btn--soft");
      $("tab-rev-all").classList.add("btn--primary");
    } else if(status==="correct") {
      $("tab-rev-correct").classList.remove("btn--soft");
      $("tab-rev-correct").classList.add("btn--primary");
    } else {
      $("tab-rev-wrong").classList.remove("btn--soft");
      $("tab-rev-wrong").classList.add("btn--primary");
    }
  }

  function toggleReview() {
    const r = $("review");
    r.hidden = !r.hidden;
    if (!r.hidden) { filterReview("all"); r.scrollIntoView({ behavior: "smooth" }); }
  }`;

const oldToggleReviewRegex = /function toggleReview\(\) \{[\s\S]{0,200}smooth" \}\);\s*\}/;
if (oldToggleReviewRegex.test(html)) { html = html.replace(oldToggleReviewRegex, reviewFilterLogic); } else { console.log("oldToggleReviewRegex not matched"); }

const oldRemedialRegex = /const weak = extractWeakTopics\(finalAttempt\);\n[\s\S]{0,400}remSec\.hidden = true;\n\s*\}/;
const newRemedial = `const weak = extractWeakTopics(finalAttempt);
    const remSec = $("remedial-section");
    remSec.hidden = false;
    $("weak-topics-list").innerHTML = "";
    if (weak.length > 0) {
       $("weak-topics-list").innerHTML = "<li>Topik yang paling perlu diulang: <b>" + weak.join(", ") + "</b></li>";
    } else {
       $("weak-topics-list").innerHTML = "<li>Belum cukup data untuk menentukan topik yang perlu diulang.</li>";
    }`;
if (oldRemedialRegex.test(html)) { html = html.replace(oldRemedialRegex, newRemedial); } else { console.log("oldRemedialRegex not matched"); }

html = html.replace(/let uAns = log\.selectedOptionId \? q\.options\[log\.selectedOptionId\] : ""\;/, `let uAns = log.selectedOptionId !== null && log.selectedOptionId !== undefined ? q.options[log.selectedOptionId] : "Tidak dijawab";`);

fs.writeFileSync("index.html", html);
console.log("Done");
