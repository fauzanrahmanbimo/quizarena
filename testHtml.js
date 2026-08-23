const fs = require("fs");
const html = fs.readFileSync("index.html", "utf8");
const ids = [...html.matchAll(/id="([^"]+)"/g)].map(m=>m[1]);
const duplicates = ids.filter((item, index) => ids.indexOf(item) !== index);
console.log("Duplicate IDs:", [...new Set(duplicates)]);

const js = html.split("<script>")[1].split("</script>")[0];
// check function references
const onclicks = [...html.matchAll(/onclick="([^"(]+)/g)].map(m=>m[1]);
const missingFunctions = onclicks.filter(fn => !js.includes("function " + fn) && !js.includes("window." + fn) && fn !== "document.getElementById");
console.log("Missing functions referenced in onclick:", missingFunctions);

