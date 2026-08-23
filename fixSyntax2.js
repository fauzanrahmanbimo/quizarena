const fs = require("fs");
let html = fs.readFileSync("index.html", "utf8");

html = html.replace(/afterFinish\(\);\n\}\n\n\s*function finishVs\(\)/, "afterFinish();\n\n  function finishVs()");

fs.writeFileSync("index.html", html);
console.log("Fixed");
