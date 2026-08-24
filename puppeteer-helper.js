const puppeteer = require('puppeteer');

const isCI = process.env.CI === 'true';

const browserLaunchOptions = {
  headless: 'new',
  ...(isCI ? {
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  } : {})
};

async function launchBrowser(customOptions = {}) {
  return puppeteer.launch({ ...browserLaunchOptions, ...customOptions });
}

module.exports = { launchBrowser };
