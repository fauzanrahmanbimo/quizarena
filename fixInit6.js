const fs = require("fs");
let html = fs.readFileSync("index.html", "utf8");
html = html.replace(/switchScreen\(screens\.dashboard\)/g, "show('dashboard')");
html = html.replace(/switchScreen\(screens\.home\)/g, "show('home')");
fs.writeFileSync("index.html", html);
console.log("Fixed switchScreen");
