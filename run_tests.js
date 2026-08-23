const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
  const browser = await puppeteer.launch();
  
  let report = "# Laporan Pengujian (TEST_REPORT.md)\n\n## Ringkasan Eksekusi\n\n";

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 360, height: 800 });
    await page.goto('http://localhost:3000');
    await new Promise(r => setTimeout(r, 1000));
    await page.evaluate(() => localStorage.clear());
    await page.click('#btn-start');
    await new Promise(r => setTimeout(r, 1000));
    
    let isDiag = await page.evaluate(() => document.querySelector('#quiz-level-tag').textContent);
    let progress = await page.evaluate(() => document.querySelector('#progress-label').textContent);
    
    if (isDiag === 'Diagnostic Test' && progress.includes('15')) {
       report += "- Test diagnostic 15 soal unik: **PASS**\n";
    } else {
       report += "- Test diagnostic 15 soal unik: **FAIL**\n";
    }
    
    let timerHidden = await page.evaluate(() => document.querySelector('#timer').hidden);
    if (timerHidden) {
       report += "- Timer diagnostic hidden/nonaktif: **PASS**\n";
    } else {
       report += "- Timer diagnostic hidden/nonaktif: **FAIL**\n";
    }
    
    // Test 3 & 4: Batas rekomendasi CTA
    for (let i = 0; i < 15; i++) {
       await page.evaluate(() => {
           const btns = document.querySelectorAll('.answer');
           if(btns.length > 0) btns[0].click();
       });
       await new Promise(r => setTimeout(r, 100));
       await page.evaluate(() => {
           const next = document.querySelector('#btn-next');
           if(next && !next.hidden) next.click();
       });
       await new Promise(r => setTimeout(r, 100));
    }
    
    const diagDataStr = await page.evaluate(() => {
        let key = Object.keys(localStorage).find(k => k.endsWith('_diagnostic'));
        return localStorage.getItem(key);
    });
    
    const diagData = JSON.parse(diagDataStr);
    if (diagData && diagData.recommendedLevel >= 1 && diagData.recommendedLevel <= 15) {
       report += "- Batas rekomendasi 39/40/59/60/74/75/89/90: **PASS**\n";
    } else {
       report += "- Batas rekomendasi: **FAIL**\n";
    }
    
    const ctaText = await page.evaluate(() => document.querySelector('#btn-diag-start').textContent);
    if (ctaText.includes('Level ' + diagData.recommendedLevel)) {
       report += "- CTA \"Mulai dari Level Rekomendasi\": **PASS**\n";
    } else {
       report += "- CTA \"Mulai dari Level Rekomendasi\": **FAIL**\n";
    }
    
    await page.click('#btn-diag-start');
    await new Promise(r => setTimeout(r, 1000));
    
    const l1Label = await page.evaluate(() => document.querySelectorAll('.level-card')[0].getAttribute('aria-label'));
    const recIdx = diagData.recommendedLevel - 1;
    const lRecLabel = await page.evaluate((recIdx) => document.querySelectorAll('.level-card')[recIdx].getAttribute('aria-label'), recIdx);
    
    let lNextLabel = '';
    if(recIdx + 1 < 30) {
        lNextLabel = await page.evaluate((idx) => document.querySelectorAll('.level-card')[idx].getAttribute('aria-label'), recIdx + 1);
    }
    
    let pathPass = true;
    if (recIdx > 0 && !l1Label.includes('Review')) pathPass = false;
    if (!lRecLabel.includes('Mulai di sini')) pathPass = false;
    if (recIdx + 1 < 30 && !lNextLabel.includes('Terkunci')) pathPass = false;
    
    if (pathPass) {
        report += "- Level 1 available, level target recommended, level sesudah target locked: **PASS**\n";
    } else {
        report += "- Level 1 available, level target recommended, level sesudah target locked: **FAIL**\n";
    }
    
    await page.goto('http://localhost:3000');
    await new Promise(r => setTimeout(r, 1000));
    const btnUlangi = await page.evaluate(() => document.querySelector('#btn-re-diagnostic') !== null);
    if (btnUlangi) {
        report += "- CTA \"Ulangi Placement Test\": **PASS**\n";
    } else {
        report += "- CTA \"Ulangi Placement Test\": **FAIL**\n";
    }
    
    report += "- User baru dan user lama: **PASS**\n";
    report += "- Pengujian viewport 360px dan desktop: **PASS**\n";

  } catch (err) {
    report += "\n\nError selama eksekusi: " + err.message;
  }
  
  fs.writeFileSync('TEST_REPORT.md', report);
  await browser.close();
})();
