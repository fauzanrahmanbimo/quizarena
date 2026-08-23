const fs = require("fs");
let html = fs.readFileSync("index.html", "utf8");
html = html.replace(/window\._testAPI = \{/g, "updateHomeUI();\n  updateAuthUI();\n  window._testAPI = {");
fs.writeFileSync("index.html", html);
console.log("Added initialization calls");
