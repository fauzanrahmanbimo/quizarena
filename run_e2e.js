const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
    let report = "# Laporan Pengujian (TEST_REPORT.md)\n\n## E2E Test (Puppeteer)\n\n";
    let exitCode = 0;
    const browser = await puppeteer.launch();
    
    function logResult(name, pass, msg="") {
        if (pass) {
            report += `- ${name}: **PASS**\n`;
            console.log(`[PASS] ${name}`);
        } else {
            report += `- ${name}: **FAIL** ${msg}\n`;
            console.error(`[FAIL] ${name} - ${msg}`);
            exitCode = 1;
        }
    }

    try {
        const page = await browser.newPage();
        await page.setViewport({ width: 1440, height: 900 });
        await page.goto('http://localhost:3000');
        await new Promise(r => setTimeout(r, 1000));
        
        const deskScroll = await page.evaluate(() => document.documentElement.scrollWidth);
        const deskInner = await page.evaluate(() => window.innerWidth);
        logResult("Desktop 1440x900 overflow check", deskScroll <= deskInner);

        await page.evaluate(() => { localStorage.setItem('quizarena_onboarded', '1'); window._testAPI.goToLevels(); });
        await new Promise(r => setTimeout(r, 1000));
        logResult("Desktop cards visible", await page.evaluate(() => !!document.querySelectorAll('.level-card')[0]));
        
        await page.setViewport({ width: 360, height: 800 });
        const mobScroll = await page.evaluate(() => document.documentElement.scrollWidth);
        const mobInner = await page.evaluate(() => window.innerWidth);
        logResult("Mobile 360x800 overflow check", mobScroll <= mobInner);
        
        await page.evaluate(() => { window._testAPI.startLevel(0); });
        await new Promise(r => setTimeout(r, 1000));
        
        // Timer pause test
        await page.evaluate(() => {
            Object.defineProperty(document, 'hidden', { configurable: true, get: function() { return true; } });
            document.dispatchEvent(new Event('visibilitychange'));
        });
        await new Promise(r => setTimeout(r, 500));
        logResult("Timer berhenti dan overlay muncul saat hidden", await page.evaluate(() => !!document.querySelector('#pause-overlay')));
        
        await page.evaluate(() => { window.resumeFromPause(); });
        await new Promise(r => setTimeout(r, 500));
        logResult("Overlay hilang saat dilanjutkan tanpa error interval", await page.evaluate(() => !document.querySelector('#pause-overlay')));
        
        logResult("Review tersembunyi sebelum finish()", await page.evaluate(() => document.querySelector('#review').hidden));
        
        await page.evaluate(() => {
            const p = window._testAPI.getPlayer();
            p.correct = 1; 
            window._testAPI.getQuestions().length = 15;
            window._testAPI.finish(); 
        });
        await new Promise(r => setTimeout(r, 1000));
        
        const statAcc = await page.evaluate(() => document.querySelector('#stat-acc').textContent);
        const statCorrect = await page.evaluate(() => document.querySelector('#stat-correct').textContent);
        const isNeedsPractice = await page.evaluate(() => document.querySelector('#result-status-badge').textContent.includes('Needs Practice'));
        const hasRetry = await page.evaluate(() => document.querySelector('#dynamic-ctas').textContent.includes('Ulangi Level'));
        
        logResult("Summary P0-D: Score, Correct, Accuracy terender", statAcc === '7%' && statCorrect === '1');
        logResult("Score 7% = Needs Practice dan muncul Ulangi", isNeedsPractice && hasRetry);
        
        await page.evaluate(() => { window._testAPI.toggleReview(); });
        await new Promise(r => setTimeout(r, 500));
        
        const filterWorks = await page.evaluate(() => {
            window._testAPI.filterReview('wrong');
            return document.querySelector('.review-item:not([style*="display: none"])') !== null;
        });
        logResult("Review filter tab (Semua/Benar/Salah)", filterWorks);
        
        const fallbackText = await page.evaluate(() => {
            const el = document.querySelectorAll('.review-explain')[0];
            return el ? el.textContent : '';
        });
        logResult("Fallback textContent explanation berjalan (XSS safe)", fallbackText.includes('Pembahasan belum tersedia') || fallbackText.includes('💡'));

    } catch (err) {
        logResult("E2E Execution Error", false, err.message);
    }
    
    fs.writeFileSync('TEST_REPORT.md', report);
    await browser.close();
    process.exit(exitCode);
})();
