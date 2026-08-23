const fs = require("fs");
let html = fs.readFileSync("index.html", "utf8");
html = html.replace(/\$\("meta-count"\)\.textContent = LEVELS\.length;\n\s*\$\("meta-qtotal"\)\.textContent = LEVELS\.reduce[^\n]+\n\s*\$\("meta-time"\)\.textContent = CONFIG\.timePerQuestion \+ "s";/, "// meta counts removed");
fs.writeFileSync("index.html", html);
console.log("Fixed init error");
