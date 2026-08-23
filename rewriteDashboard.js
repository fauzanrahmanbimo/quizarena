const fs = require("fs");
let html = fs.readFileSync("index.html", "utf8");

// Modify chart empty state and add max accuracy summary
const oldChartLogic = /if \(chartData\.length < 2\) \{[\s\S]*?\}\s*else\s*\{[\s\S]*?chartAlt\.textContent = altText;\n\s*\}/;
const newChartLogic = `if (chartData.length < 2) {
         chartBox.style.alignItems = "center";
         chartBox.style.justifyContent = "center";
         chartBox.textContent = "Belum cukup data. Selesaikan latihan pertama untuk melihat grafik progres di sini.";
         chartAlt.textContent = "Grafik performa kosong karena belum cukup data.";
     } else {
         chartBox.style.alignItems = "flex-end";
         chartBox.style.justifyContent = "flex-start";
         
         let maxAcc = 0;
         chartData.forEach(d => { if(d.accuracy > maxAcc) maxAcc = d.accuracy; });
         
         // Insert summary element before chart
         let summaryEl = document.getElementById("dash-chart-summary");
         if (!summaryEl) {
             summaryEl = document.createElement("p");
             summaryEl.id = "dash-chart-summary";
             summaryEl.style.fontSize = "14px";
             summaryEl.style.marginBottom = "8px";
             summaryEl.style.fontWeight = "600";
             chartBox.parentNode.insertBefore(summaryEl, chartBox);
         }
         summaryEl.textContent = "Dalam 7 sesi terakhir, akurasi tertinggi Anda adalah " + maxAcc + "%.";

         let altText = "Grafik 7 sesi terakhir: ";
         chartData.forEach((d, i) => {
             const barWrap = document.createElement("div");
             barWrap.style = "display:flex; flex-direction:column; align-items:center; flex:1; min-width:30px;";
             
             const bar = document.createElement("div");
             bar.style = "width:100%; max-width:40px; background:var(--primary); border-radius:4px 4px 0 0; transition:height 0.3s;";
             bar.style.height = Math.max(5, d.accuracy) + "%"; // min 5% for visibility
             
             const label = document.createElement("div");
             label.style = "font-size:10px; margin-top:4px; color:var(--text-dim); text-align:center;";
             label.textContent = d.accuracy + "%";
             
             barWrap.appendChild(bar);
             barWrap.appendChild(label);
             chartBox.appendChild(barWrap);
             altText += "Sesi " + (i+1) + " akurasi " + d.accuracy + "%. ";
         });
         chartAlt.textContent = altText;
     }`;
html = html.replace(oldChartLogic, newChartLogic);


// Add duration to History items
const oldHistoryLoop = /const left = document\.createElement\("div"\);\n\s*const p1.*?p1\.textContent = typeStr;\n\s*const p2.*?p2\.textContent = dStr;/;
const newHistoryLoop = `const left = document.createElement("div");
           const p1 = document.createElement("div"); p1.style="font-weight:bold; font-size:14px;"; p1.textContent = typeStr;
           
           let durStr = "";
           if (r.startedAt && r.completedAt) {
               const s = Math.round((r.completedAt - r.startedAt)/1000);
               const m = Math.floor(s/60);
               const sec = s % 60;
               durStr = " • " + (m > 0 ? m + "m " : "") + sec + "s";
           }
           
           const p2 = document.createElement("div"); p2.style="font-size:12px; color:var(--text-dim);"; p2.textContent = dStr + durStr;`;

html = html.replace(oldHistoryLoop, newHistoryLoop);

fs.writeFileSync("index.html", html);
console.log("Done");
