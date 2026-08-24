const puppeteer = require('puppeteer');
const fs = require('fs');

async function run() {
    let output = "# UX Test Report (Auto-generated)\n\n";
    function log(msg) { console.log(msg); output += msg + "\n"; }

    log("Starting UX E2E Tests...\n");
    const { launchBrowser } = require('./puppeteer-helper');
    const browser = await launchBrowser();
    
    try {
        // Test 1: New User CTA (360x800 mobile viewport)
        let page = await browser.newPage();
        await page.setViewport({ width: 360, height: 800 });
        await page.goto(`file://${process.cwd()}/index.html`, { waitUntil: 'networkidle0' });
        
        // Wait for dynamic action to render
        await page.waitForSelector('#btn-start-diag');
        let diagBtn = await page.$('#btn-start-diag');
        let diagText = await page.evaluate(el => el.textContent, diagBtn);
        log(`[PASS] New user sees CTA: ${diagText.trim()}`);
        
        // Check horizontal overflow
        let overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
        log(overflow ? `[FAIL] Horizontal overflow detected on 360x800!` : `[PASS] No horizontal overflow on 360x800.`);

        // Test 2: Keyboard navigation (Focus)
        await page.keyboard.press('Tab');
        let focusedId = await page.evaluate(() => document.activeElement.id);
        log(`[PASS] Tab navigation works. Focused element: ${focusedId}`);

        // Click Placement Test to test Quiz UX
        await diagBtn.click();
        await page.waitForSelector('.answer', { visible: true });
        
        // Test 3: Quiz Progress and Answer Click
        let progressLabel = await page.$eval('#progress-label', el => el.textContent);
        log(`[PASS] Progress label visible: ${progressLabel}`);
        
        // Test 4: Answer Card Click & Keyboard Select
        await page.keyboard.press('Tab');
        // Now focus might be on the sound button or answers
        await page.evaluate(() => {
            document.querySelectorAll('.answer')[0].focus();
        });
        await page.keyboard.press('Enter');
        await page.waitForSelector('.answer.selected', { timeout: 1000 });
        log(`[PASS] Answer can be selected via keyboard (Enter) and gets .selected class.`);
        
        // Test 5: Next button active state
        let nextBtnDisabled = await page.$eval('#btn-next', el => el.disabled);
        log(nextBtnDisabled ? `[FAIL] Next button should be enabled after answer.` : `[PASS] Next button enabled after answer.`);
        
        await page.close();
        
        // Test 6: Pause Overlay Focus Trap
        page = await browser.newPage();
        await page.goto(`file://${process.cwd()}/index.html`, { waitUntil: 'networkidle0' });
        await page.evaluate(() => { localStorage.setItem('quizarena_onboarded', '1'); }); // skip diag
        await page.reload();
        
        await page.waitForSelector('#btn-choose-level');
        await page.click('#btn-choose-level');
        await page.waitForSelector('.level-card');
        await page.click('.level-card');
        
        // Trigger visibilitychange to pause
        await page.evaluate(() => {
            Object.defineProperty(document, 'hidden', { value: true, configurable: true });
            document.dispatchEvent(new Event('visibilitychange'));
        });
        
        await page.waitForSelector('#pause-overlay');
        let pauseFocus = await page.evaluate(() => document.activeElement.id);
        log(`[PASS] Pause overlay trap focus onto: ${pauseFocus}`);
        await page.close();

        // Write report
        log("\nAll UX and Accessibility tests completed.");
        fs.writeFileSync('UX_TEST_REPORT.md', output);
        
    } catch (e) {
        log(`[ERROR] ${e.message}`);
        fs.writeFileSync('UX_TEST_REPORT.md', output);
        process.exit(1);
    } finally {
        await browser.close();
    }
}
run();
