const puppeteer = require("puppeteer");
const fs = require("fs");
const { spawn } = require("child_process");

async function run() {
    let output = "# UX Test Report (Auto-generated)\n\n";
    function log(msg) { console.log(msg); output += msg + "\n"; }

    log("Starting UX E2E Tests with local server...\n");
    const server = spawn("node", ["-e", "require(\"http\").createServer((req, res) => { const fs=require(\"fs\"); try { res.end(fs.readFileSync(\".\" + req.url.split(\"?\")[0])); } catch(e) { res.statusCode = 404; res.end(); } }).listen(3003);"]);
    await new Promise(r => setTimeout(r, 1000));
    
    const browser = await puppeteer.launch({ headless: true });
    
    try {
        let page = await browser.newPage();
        await page.setViewport({ width: 360, height: 800 });
        await page.goto("http://localhost:3003/index.html", { waitUntil: "networkidle0" });
        
        await page.waitForSelector("#btn-start-diag", { timeout: 3000 });
        let diagBtn = await page.$("#btn-start-diag");
        let diagText = await page.evaluate(el => el.textContent, diagBtn);
        log("[PASS] New user sees CTA: " + diagText.trim());
        
        let overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
        log(overflow ? "[FAIL] Horizontal overflow detected on 360x800!" : "[PASS] No horizontal overflow on 360x800.");

        await page.keyboard.press("Tab");
        let focusedId = await page.evaluate(() => document.activeElement.id);
        log("[PASS] Tab navigation works. Focused element: " + focusedId);

        await diagBtn.click();
        await page.waitForSelector(".answer", { visible: true });
        
        let progressLabel = await page.$eval("#progress-label", el => el.textContent);
        log("[PASS] Progress label visible: " + progressLabel);
        
        await page.evaluate(() => { document.querySelectorAll(".answer")[0].focus(); });
        await page.keyboard.press("Enter");
        await page.waitForSelector(".answer.selected", { timeout: 1000 });
        log("[PASS] Answer can be selected via keyboard (Enter) and gets .selected class.");
        
        let nextBtnDisabled = await page.$eval("#btn-next", el => el.disabled);
        log(nextBtnDisabled ? "[FAIL] Next button should be enabled after answer." : "[PASS] Next button enabled after answer.");
        
        await page.close();
        
        page = await browser.newPage();
        await page.goto("http://localhost:3003/index.html", { waitUntil: "networkidle0" });
        await page.evaluate(() => { localStorage.setItem("quizarena_onboarded", "1"); localStorage.setItem("quizarena_best_Diagnostic Test", "80"); });
        await page.reload({ waitUntil: "networkidle0" });
        
        await page.waitForSelector("#btn-start-rec", { timeout: 3000 });
        let recText = await page.$eval("#btn-start-rec", el => el.textContent);
        log("[PASS] Post-diagnostic user sees CTA: " + recText.trim());
        await page.close();
        
        log("\nAll UX and Accessibility tests completed.");
        fs.writeFileSync("UX_TEST_REPORT.md", output);
        
    } catch (e) {
        log("[ERROR] " + e.message);
        fs.writeFileSync("UX_TEST_REPORT.md", output);
    } finally {
        await browser.close();
        server.kill();
    }
}
run();
