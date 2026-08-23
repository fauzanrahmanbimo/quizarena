const fs = require("fs");
let html = fs.readFileSync("index.html", "utf8");
html = html.replace(/\$\("([^"]+)"\)\.addEventListener/g, `$$("$1")?.addEventListener`);
fs.writeFileSync("index.html", html);
console.log("Fixed addEventListener");
