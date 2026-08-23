const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
    let report = "# Laporan Pengujian (TEST_REPORT.md)\n\n## E2E Test Dashboard P0-E (Puppeteer)\n\n";
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
        await page.setViewport({ width: 360, height: 800 });
        await page.goto('http://localhost:3000');
        await new Promise(r => setTimeout(r, 1000));
        
        // Scenario A: Akun baru (no localStorage)
        await page.evaluate(() => { localStorage.clear(); localStorage.setItem('quizarena_onboarded', '1'); document.querySelector('#btn-dashboard').click(); });
        await new Promise(r => setTimeout(r, 500));
        
        const noDiagText = await page.evaluate(() => document.querySelector('#dash-header-cta').textContent);
        logResult("Akun baru: CTA = Ambil Placement Test", noDiagText.includes('Placement Test'), `Text: ${noDiagText}`);
        
        // Scenario B: Hanya diagnostic
        await page.evaluate(() => {
            const diagLog = { attemptId:"d1", attemptType:"diagnostic", levelId:null, startedAt:100, completedAt:1000, totalQuestions:15, correctCount:5, incorrectCount:10, unansweredCount:0, accuracy: 33, averageAnswerTime:1, passed:null, answers:[] };
            localStorage.setItem(window._testAPI.APP + "_fullAttemptsLog", JSON.stringify([diagLog]));
            window._testAPI.renderDashboard();
        });
        await new Promise(r => setTimeout(r, 500));
        
        const diagCta = await page.evaluate(() => document.querySelector('#dash-header-cta').textContent);
        const diagAccPrac = await page.evaluate(() => document.querySelector('#dash-stat-acc-prac').textContent);
        logResult("Hanya diagnostic: CTA = Mulai Level Rekomendasi", diagCta.includes('Mulai Level'), `Text: ${diagCta}`);
        logResult("Diagnostic tidak mencemari akurasi latihan", diagAccPrac === '-');
        
        // Scenario C: Diagnostic + Failed Regular Quiz
        await page.evaluate(() => {
            const logs = JSON.parse(localStorage.getItem(window._testAPI.APP + "_fullAttemptsLog"));
            logs.push({ attemptId:"q1", attemptType:"timed_quiz", levelId:1, startedAt:100, completedAt:61000, totalQuestions:10, correctCount:2, incorrectCount:8, unansweredCount:0, accuracy: 20, averageAnswerTime:6, passed:false, answers:[
                {topic: 'Grammar', isCorrect: false}, {topic: 'Grammar', isCorrect: false}, {topic: 'Grammar', isCorrect: false},
                {topic: 'Vocab', isCorrect: true}, {topic: 'Vocab', isCorrect: true}, {topic: 'Vocab', isCorrect: true}
            ] });
            localStorage.setItem(window._testAPI.APP + "_fullAttemptsLog", JSON.stringify(logs));
            window._testAPI.renderDashboard();
        });
        await new Promise(r => setTimeout(r, 500));
        
        const failedCta = await page.evaluate(() => document.querySelector('#dash-header-cta').textContent);
        const weakTopic = await page.evaluate(() => document.querySelector('#dash-topic-weak').textContent);
        logResult("Failed quiz (weak topic > 3): CTA = Ulangi Topik Lemah", failedCta.includes('Ulangi Topik'), `Text: ${failedCta}`);
        logResult("Insight topik lemah terdeteksi", weakTopic.includes('Grammar'));
        
        // Scenario D: Diagnostic + Passed Regular Quiz
        await page.evaluate(() => {
            const logs = JSON.parse(localStorage.getItem(window._testAPI.APP + "_fullAttemptsLog"));
            logs.push({ attemptId:"q2", attemptType:"timed_quiz", levelId:1, startedAt:100, completedAt:61000, totalQuestions:10, correctCount:9, incorrectCount:1, unansweredCount:0, accuracy: 90, averageAnswerTime:6, passed:true, answers:[] });
            localStorage.setItem(window._testAPI.APP + "_fullAttemptsLog", JSON.stringify(logs));
            window._testAPI.renderDashboard();
        });
        await new Promise(r => setTimeout(r, 500));
        
        const passedCta = await page.evaluate(() => document.querySelector('#dash-header-cta').textContent);
        logResult("Passed quiz: CTA = Lanjutkan Level Berikutnya", passedCta.includes('Lanjutkan Level Berikutnya'), `Text: ${passedCta}`);
        
        // Scenario E: Overflow check
        await page.setViewport({ width: 360, height: 800 });
        const mobScroll = await page.evaluate(() => document.documentElement.scrollWidth);
        const mobInner = await page.evaluate(() => window.innerWidth);
        logResult("Mobile 360x800 dashboard tanpa clipping (Root causes CSS fixed)", mobScroll <= mobInner, `Scroll: ${mobScroll} Inner: ${mobInner}`);

    } catch (err) {
        logResult("E2E Execution Error", false, err.message);
    }
    
    fs.appendFileSync('TEST_REPORT.md', "\n" + report);
    await browser.close();
    process.exit(exitCode);
})();
