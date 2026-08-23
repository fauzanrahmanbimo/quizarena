const fs = require("fs");
let html = fs.readFileSync("index.html", "utf8");

const oldVis = /document\.addEventListener\(\"visibilitychange\"[\s\S]*?\}\);/;
const newVis = `document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      if (!noTimer() && timer) {
        clearInterval(timer);
        timer = null;
        let overlay = document.getElementById("pause-overlay");
        if (!overlay) {
          overlay = document.createElement("div");
          overlay.id = "pause-overlay";
          overlay.style.position = "fixed";
          overlay.style.top = "0"; overlay.style.left = "0"; overlay.style.width = "100%"; overlay.style.height = "100%";
          overlay.style.background = "rgba(0,0,0,0.8)"; overlay.style.color = "white"; overlay.style.zIndex = "9999";
          overlay.style.display = "flex"; overlay.style.flexDirection = "column"; overlay.style.justifyContent = "center"; overlay.style.alignItems = "center";
          overlay.style.backdropFilter = "blur(4px)";
          overlay.setAttribute("role", "dialog");
          overlay.setAttribute("aria-modal", "true");
          overlay.setAttribute("aria-label", "Kuis Dijeda");
          document.body.appendChild(overlay);
        }
        overlay.innerHTML = "<h2 style=\\"margin-bottom:12px;\\">Kuis Dijeda</h2><p style=\\"margin-bottom:24px;\\">Waktu berhenti sementara karena tab tidak aktif.</p><button id=\\"btn-resume-quiz\\" class=\\"btn btn--primary\\" style=\\"margin-top:20px;\\">Lanjutkan Kuis</button>";
        
        const btn = overlay.querySelector("#btn-resume-quiz");
        btn.addEventListener("click", () => {
          overlay.remove();
          if (!noTimer()) {
            startTimer();
          }
        });
        
        // Trap focus
        setTimeout(() => btn.focus(), 50);
        overlay.addEventListener("keydown", (e) => {
          if (e.key === "Tab") {
             e.preventDefault();
             btn.focus();
          }
          if (e.key === "Escape") {
             e.preventDefault(); // Do not allow bypass
          }
        });
      }
    }
  });`;

html = html.replace(oldVis, newVis);

// Also remove `resumeFromPause()` if it exists globally
html = html.replace(/window\.resumeFromPause = function\(\) \{[\s\S]*?\};/, "");

fs.writeFileSync("index.html", html);
console.log("Done");
