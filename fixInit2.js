const fs = require("fs");
let html = fs.readFileSync("index.html", "utf8");
html = html.replace(/\$\("meta-count"\)\.textContent/g, "// $(");
html = html.replace(/\$\("meta-qtotal"\)\.textContent/g, "// $(");
html = html.replace(/\$\("meta-time"\)\.textContent/g, "// $(");
fs.writeFileSync("index.html", html);
console.log("Fixed init error");
