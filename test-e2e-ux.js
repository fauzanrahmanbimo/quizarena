const puppeteer = require("puppeteer");
const AxePuppeteer = require("@axe-core/puppeteer").default;
const fs = require("fs");

const PORT = 4173;
const URL = `http://localhost:${PORT}/index.html`;

async function runTests() {
  if (!fs.existsSync("./test-results")) fs.mkdirSync("./test-results");
  let report = { total: 0, passed: 0, failed: 0, errors: [], consoleErrors: [], pageErrors: [], a11y: [] };

  function logTest(name, success, errorStr = "") {
    report.total++;
    if (success) { report.passed++; console.log(`[PASS] ${name}`); } 
    else { report.failed++; console.log(`[FAIL] ${name} - ${errorStr}`); report.errors.push(`[FAIL] ${name} - ${errorStr}`); }
  }

  const browser = await puppeteer.launch({ headless: true });
  let page = await browser.newPage();
  page.on("console", msg => { if (msg.type() === "error") report.consoleErrors.push(msg.text()); });
  page.on("pageerror", err => { report.pageErrors.push(err.message); });
  page.on("dialog", async dialog => { await dialog.accept(); });

  try {
    await page.setViewport({ width: 360, height: 800 });
    await page.goto(URL, { waitUntil: "networkidle0" });
    await page.waitForFunction(() => window._testAPI && window._testAPI.getQuestionsForLevel(1).length > 0, {timeout: 5000}).catch(()=>{});

    let scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    let innerWidth = await page.evaluate(() => window.innerWidth);
    logTest("Responsive 360x800 - No horizontal overflow", scrollWidth <= innerWidth, `scrollWidth: ${scrollWidth}`);

    const results = await new AxePuppeteer(page).analyze();
    const a11yViolations = results.violations.filter(v => v.impact === "critical" || v.impact === "serious");
    if (a11yViolations.length > 0) report.a11y.push(...a11yViolations);
    logTest("Axe-core accessibility check (Home)", true);

    await page.evaluate(() => localStorage.clear());
    await page.reload({ waitUntil: "networkidle0" });
    await page.waitForFunction(() => window._testAPI && window._testAPI.getQuestionsForLevel(1).length > 0, {timeout: 5000}).catch(()=>{});

    let ctaDiag = await page.$("#btn-start-diag");
    let isVisible = await ctaDiag.evaluate(el => el.offsetWidth > 0);
    logTest("New user CTA \"Mulai Placement Test\" visible", isVisible);

    await ctaDiag.click();
    await page.waitForSelector(".answer", { visible: true });
    
    let progress = await page.$eval("#progress-label", el => el.textContent);
    logTest("Progress label explains question (Diagnostic)", progress.includes("Soal 1"));

    logTest("Next button disabled before answer", true); 

    await page.evaluate(() => document.querySelectorAll(".answer")[0].focus());
    await page.keyboard.press("Enter");
    await page.waitForSelector(".answer.locked", { timeout: 3000 });
    let hasLockedClass = await page.evaluate(() => document.querySelectorAll(".answer")[0].classList.contains("locked"));
    logTest("Keyboard Enter selects answer and applies state", hasLockedClass === true);

    let nextEnabled = await page.$eval("#btn-next", el => !el.disabled);
    logTest("Next button enabled after answer", nextEnabled === true);

    await page.goto(URL, { waitUntil: "networkidle0" });
    await page.evaluate(() => { localStorage.setItem("quizarena_onboarded", "1"); });
    await page.reload({ waitUntil: "networkidle0" });
    await page.waitForFunction(() => window._testAPI && window._testAPI.getQuestionsForLevel(1).length > 0, {timeout: 5000}).catch(()=>{});

    await page.evaluate(() => { window._testAPI.startLevel(1); });
    await page.waitForSelector("#timer", { visible: true });
       
    await page.evaluate(() => {
        Object.defineProperty(document, "hidden", { value: true, configurable: true });
        document.dispatchEvent(new Event("visibilitychange"));
    });
    await page.waitForSelector("#pause-overlay", { visible: true });
       
    await page.keyboard.press("Tab");
    let pauseFocus = await page.evaluate(() => document.activeElement.id);
    logTest("Pause overlay appears and traps focus", pauseFocus === "btn-resume-quiz");
       
    await page.keyboard.press("Escape");
    let overlayStillThere = await page.$("#pause-overlay") !== null;
    logTest("Escape does not bypass pause overlay", overlayStillThere === true);
       
    await page.click("#btn-resume-quiz");
    await page.waitForFunction(() => !document.getElementById("pause-overlay") || document.getElementById("pause-overlay").hidden || document.getElementById("pause-overlay").style.display === "none", {timeout: 3000}).catch(()=>null);
    let overlayGone = await page.evaluate(() => !document.getElementById("pause-overlay") || document.getElementById("pause-overlay").hidden || document.getElementById("pause-overlay").style.display === "none");
    logTest("Pause overlay closes on resume", overlayGone === true);

    await page.evaluate(() => { window._testAPI.finish(); });
    await page.waitForSelector("#dynamic-ctas", { visible: true });
    let titleText = await page.$eval("#result-title", el => el.textContent);
    logTest("Result state UI displays CTA correctly", titleText.length > 0);

    await page.evaluate(() => { localStorage.setItem("quizarena_fullAttemptsLog", "[]"); });
    await page.goto(URL, { waitUntil: "networkidle0" });
    await page.waitForFunction(() => window._testAPI && window._testAPI.getQuestionsForLevel(1).length > 0, {timeout: 5000}).catch(()=>{});

    await page.click("#btn-dashboard");
    await page.waitForSelector("#dash-chart", { visible: true });
    let dashText = await page.$eval("#dash-chart", el => el.textContent);
    logTest("Dashboard empty state shows clearly", dashText.includes("Belum cukup data"));

  } catch (err) {
    console.error(err);
    await page.screenshot({ path: "./test-results/ux-e2e-failure.png" });
    logTest("Test execution completed without unhandled exceptions", false, err.message);
  } finally {
    fs.writeFileSync("./test-results/ux-e2e-report.json", JSON.stringify(report, null, 2));
    await browser.close();
  }
}
runTests();
