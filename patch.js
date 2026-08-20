const fs = require('fs');
let c = fs.readFileSync('index.html', 'utf8');

c = c.replace(
  'function getBoard() { try { return JSON.parse(localStorage.getItem(APP + "_board")) || []; } catch (e) { return []; } }',
  'function getBoard() { return []; }'
);

c = c.replace(
  'function addToBoard(name, level, score, acc) { const b = getBoard(); b.push({ name: name || "Kamu", level: level.level, score, acc }); b.sort((x, y) => y.score - x.score); localStorage.setItem(APP + "_board", JSON.stringify(b.slice(0, 10))); }',
  'function addToBoard(name, level, score, acc) { if (!window.fbDb) return; const dbRef = window.fbRef(window.fbDb, "leaderboard"); const newDoc = window.fbPush(dbRef); window.fbSet(newDoc, { name: name || "Kamu", level: level.level, score: score, acc: acc, timestamp: Date.now() }); }'
);

const oldRenderBoard = `function renderBoard() {
    const list = getBoard();
    const ol = $("board-list");
    ol.innerHTML = "";
    if (!list.length) { ol.innerHTML = '<li class="board-empty">Belum ada skor. Main dulu yuk! \\uD83C\\uDFAE</li>'; return; }
    list.forEach((e, i) => {
      const li = document.createElement("li");
      li.className = "board-row" + (i < 3 ? " top" : "");
      const medal = ["\\uD83E\\uDD47", "\\uD83E\\uDD48", "\\uD83E\\uDD49"][i] || (i + 1) + ".";
      li.innerHTML =
        \`<span class="board-rank">\${medal}</span><span class="board-name">\${esc(e.name)}</span>\` +
        \`<span class="board-meta">Lv \${e.level} \\u00B7 \${e.acc}%</span><span class="board-score">\${e.score}</span>\`;
      ol.appendChild(li);
    });
  }`;

const newRenderBoard = `function renderBoard() {
    const ol = $("board-list");
    ol.innerHTML = '<li class="board-empty">Memuat Papan Peringkat... \\u231B</li>';
    if (window.fbDb) {
      const dbRef = window.fbRef(window.fbDb, "leaderboard");
      const q = window.fbQuery(dbRef, window.fbOrderByChild("score"), window.fbLimitToLast(20));
      window.fbGet(q).then((snap) => {
        let list = [];
        snap.forEach(child => { list.push(child.val()); });
        list.reverse();
        ol.innerHTML = "";
        if (!list.length) { ol.innerHTML = '<li class="board-empty">Belum ada skor. Main dulu yuk! \\uD83C\\uDFAE</li>'; return; }
        list.forEach((e, i) => {
          const li = document.createElement("li");
          li.className = "board-row" + (i < 3 ? " top" : "");
          const medal = ["\\uD83E\\uDD47", "\\uD83E\\uDD48", "\\uD83E\\uDD49"][i] || (i + 1) + ".";
          li.innerHTML = '<span class="board-rank">' + medal + '</span><span class="board-name">' + esc(e.name) + '</span><span class="board-meta">Lv ' + e.level + ' &middot; ' + e.acc + '%</span><span class="board-score">' + e.score + '</span>';
          ol.appendChild(li);
        });
      }).catch(err => {
        ol.innerHTML = '<li class="board-empty">Gagal memuat papan peringkat.</li>';
      });
    } else {
      ol.innerHTML = '<li class="board-empty">Sistem belum siap. Coba lagi nanti.</li>';
    }
  }`;

c = c.replace(oldRenderBoard, newRenderBoard);

fs.writeFileSync('index.html', c);
