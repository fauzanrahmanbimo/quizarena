const fs = require("fs");
const html = fs.readFileSync("index.html", "utf8");
const m = html.match(/<dialog id="modal-login"[\s\S]*?<\/dialog>/);
console.log(m ? m[0] : "not found");
const m2 = html.match(/<dialog id="modal-register"[\s\S]*?<\/dialog>/);
console.log(m2 ? m2[0] : "not found");
