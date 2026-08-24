const puppeteer = require('puppeteer');
(async () => {
  const { launchBrowser } = require('./puppeteer-helper');
  const browser = await launchBrowser();
  const page = await browser.newPage();
  page.on('pageerror', err => {
    console.error('Page Error:', err.message);
    process.exit(1);
  });
  await page.goto('http://localhost:3000');
  await page.waitForSelector('.level-card');
  const level1Locked = await page.evaluate(() => document.querySelectorAll('.level-card')[0].classList.contains('is-locked'));
  const level2Locked = await page.evaluate(() => document.querySelectorAll('.level-card')[1].classList.contains('is-locked'));
  console.log('Level 1 is locked:', level1Locked);
  console.log('Level 2 is locked:', level2Locked);
  if (level1Locked || !level2Locked) {
      console.error('Initial state incorrect');
      process.exit(1);
  }
  await page.evaluate(() => {
    window.localStorage.setItem(window.APP + '_pass_L1', '1');
    window.updateHomeUI();
  });
  const level2LockedAfter = await page.evaluate(() => document.querySelectorAll('.level-card')[1].classList.contains('is-locked'));
  console.log('Level 2 is locked after pass:', level2LockedAfter);
  if (level2LockedAfter) {
      console.error('Level 2 still locked after passing level 1');
      process.exit(1);
  }
  console.log('Smoke test passed!');
  await browser.close();
})();
