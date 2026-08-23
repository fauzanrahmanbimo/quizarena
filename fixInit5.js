const fs = require("fs");
let html = fs.readFileSync("index.html", "utf8");
html = html.replace(/window\._testAPI = \{/g, "window._testAPI = {\n    startLevel,");
fs.writeFileSync("index.html", html);
console.log("Exposed startLevel");
