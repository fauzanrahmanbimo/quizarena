const fs = require("fs");
let html = fs.readFileSync("index.html", "utf8");

html = html.replace(
  /\$\("btn-next"\)\.hidden = true;/,
  `$("btn-next").hidden = false;\n    $("btn-next").disabled = true;\n    $("btn-next").textContent = "Lanjut ke Soal Berikutnya ?";`
);

// Update Timer UI
const timerUIReplacement = `function updateTimerUI() {
    if (diagnosticMode) {
      $("timer").hidden = true;
      return;
    } else {
      $("timer").hidden = false;
    }
    const tNum = $("timer-num");
    const tBar = $("timer-bar");
    tNum.textContent = timeLeft;
    const maxTime = CONFIG.timePerQuestion || 60;
    const pct = (timeLeft / maxTime) * 100;
    tBar.style.width = pct + "%";
    
    // UX change: 30 seconds visual
    if (timeLeft <= 30) {
      tBar.style.background = "var(--danger)";
      tNum.style.color = "var(--danger)";
      tNum.textContent = "?? " + timeLeft + "s";
      tNum.classList.add("pulse-animation");
    } else {
      tBar.style.background = "var(--primary)";
      tNum.style.color = "var(--primary)";
      tNum.textContent = timeLeft;
      tNum.classList.remove("pulse-animation");
    }
  }`;

// Use a safe string replacement instead of regex!
const oldTimerCode = `function updateTimerUI() {
    const pct = (timeLeft / CONFIG.timePerQuestion) * 100;
    const bar = $("timer-bar");
    bar.style.width = pct + "%";
    bar.classList.toggle("warn", pct <= 50 && pct > 25);
    bar.classList.toggle("danger", pct <= 25);
    $("timer-num").textContent = Math.max(0, timeLeft);
  }`;

html = html.replace(oldTimerCode, timerUIReplacement);

fs.writeFileSync("index.html", html);
console.log("Done");
