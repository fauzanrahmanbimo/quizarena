const fs = require("fs");
let html = fs.readFileSync("index.html", "utf8");

html = html.replace(/function handleStart\(\) \{\n\s*\/\/ Old handleStart replaced, init is now handled via updateHomeUI\n\s*\}\s*else\s*\{\s*goToLevels\(\);\s*\}\s*\}/, 
"function handleStart() {\n    // Old handleStart replaced, init is now handled via updateHomeUI\n  }");

fs.writeFileSync("index.html", html);
console.log("Fixed");
