const fs = require("fs");
let html = fs.readFileSync("index.html", "utf8");
html = html.replace(/smooth'\}\); \} \}\);\s*\}/g, "smooth'}); } }");
html = html.replace(/smooth'\}\); \}\s*\}/g, "smooth'}); }");
fs.writeFileSync("index.html", html);
console.log("Fixed");
