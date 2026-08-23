const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto('http://localhost:4173/index.html');
  await page.waitForSelector('#btn-start-diag');
  await page.click('#btn-start-diag');
  await page.waitForSelector('.answer', {visible:true,timeout:3000}).catch(()=>{});
  const next = await page.$eval('#btn-next', el => ({
    hidden: el.hidden,
    disabled: el.disabled,
    display: window.getComputedStyle(el).display,
    className: el.className
  })).catch(e => e.message);
  console.log(next);
  await browser.close();
})();
