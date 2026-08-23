const fs = require("fs");
let html = fs.readFileSync("index.html", "utf8");

// Remove overflow-x: hidden from body and html
html = html.replace(/overflow-x:\s*hidden;/g, "");

// Ensure max-width: 100vw, box-sizing: border-box everywhere
html = html.replace(/body\s*\{/, "body { max-width: 100vw;");

// Update answer card CSS
// Target sentuh minimal nyaman untuk mobile
// Card: "seluruh card dapat diklik; target sentuh minimal nyaman untuk mobile; state default, hover, focus-visible, selected, correct, wrong, dan disabled harus berbeda jelas"
const oldAnswerCSS = /\.answer\s*\{[\s\S]*?\}/;
const newAnswerCSS = `.answer {
  position: relative; width: 100%; text-align: left; background: var(--surface);
  border: 2px solid var(--border); padding: 16px 20px; min-height: 56px;
  border-radius: var(--radius-md); font-family: var(--font-body); font-size: 16px;
  font-weight: 600; cursor: pointer; transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex; align-items: center; justify-content: space-between; gap: 12px;
  box-shadow: var(--shadow-sm); margin-bottom: 8px;
}
.answer:hover:not(:disabled) { border-color: var(--primary); transform: translateY(-1px); box-shadow: var(--shadow-md); background: var(--primary-light); }
.answer:focus-visible { outline: 3px solid var(--primary); outline-offset: 2px; }
.answer.selected { border-color: var(--primary); background: var(--primary); color: white; transform: scale(0.98); }
.answer.correct { border-color: var(--success); background: var(--success-light); color: var(--success); animation: pop 0.4s ease; }
.answer.wrong { border-color: var(--danger); background: var(--danger-light); color: var(--danger); animation: shake 0.4s ease; }
.answer:disabled { opacity: 0.7; cursor: not-allowed; pointer-events: none; }`;

html = html.replace(/\.answer\s*\{[\s\S]*?\}\n\.answer:hover[\s\S]*?\}\n/, newAnswerCSS + "\n");

// Add animation keyframes for pop
if (html.indexOf("@keyframes pop") === -1) {
  html = html.replace(/<\/style>/, `
@keyframes pop {
  0% { transform: scale(0.95); }
  50% { transform: scale(1.02); }
  100% { transform: scale(1); }
}
@keyframes pulse {
  0% { opacity: 1; }
  50% { opacity: 0.5; }
  100% { opacity: 1; }
}
.pulse-animation { animation: pulse 1s infinite; }
</style>`);
}

// Make sure topbar is flex-wrap and responsive gap
html = html.replace(/\.topbar\s*\{/, ".topbar { flex-wrap: wrap; ");

fs.writeFileSync("index.html", html);
console.log("Done");
