/**
 * Add setTimeLeft and updateTimerUI to _testAPI for E2E timer testing.
 */
const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

// Use the exact character sequence found
const oldStr = 'getQuestions: () => questions\r\n  };\r\n})();';
const newStr = 'getQuestions: () => questions,\r\n      setTimeLeft: (v) => { timeLeft = v; updateTimerUI(); },\r\n      getTimerBarClasses: () => { const b = document.getElementById(\'timer-bar\'); return b ? [...b.classList] : []; }\r\n  };\r\n})();';

if (html.includes(oldStr)) {
  html = html.replace(oldStr, newStr);
  console.log('[OK] setTimeLeft exposed in _testAPI');
  fs.writeFileSync('index.html', html);
  console.log('Done');
} else {
  // Try LF version
  const oldLF = 'getQuestions: () => questions\n  };\n})();';
  if (html.includes(oldLF)) {
    const newLF = 'getQuestions: () => questions,\n      setTimeLeft: (v) => { timeLeft = v; updateTimerUI(); },\n      getTimerBarClasses: () => { const b = document.getElementById(\'timer-bar\'); return b ? [...b.classList] : []; }\n  };\n})();';
    html = html.replace(oldLF, newLF);
    console.log('[OK] setTimeLeft exposed in _testAPI (LF)');
    fs.writeFileSync('index.html', html);
  } else {
    console.error('[FAIL] Could not find pattern. Searching...');
    const idx = html.indexOf('getQuestions');
    console.log('Context:', JSON.stringify(html.substring(idx, idx+60)));
    process.exit(1);
  }
}
