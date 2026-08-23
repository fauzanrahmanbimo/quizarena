const fs = require("fs");
const html = fs.readFileSync("index.html", "utf8");
const js = html.split("<script>")[1].split("</script>")[0];
const idRegex = /\$\("([^"]+)"\)/g;
let match;
const missing = new Set();
while((match = idRegex.exec(js)) !== null) {
  const id = match[1];
  if(!html.includes('id="'+id+'"') && !html.includes("id='"+id+"'")) {
    missing.add(id);
  }
}
console.log([...missing]);
