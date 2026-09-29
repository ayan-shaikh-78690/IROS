const puppeteer = require('puppeteer');

async function checkReload() {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.goto('http://127.0.0.1:5173/analytics', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#before-after-metrics-grid', { timeout: 10000 }).catch(() => {});
  await new Promise(r => setTimeout(r, 2000));
  const text = await page.$eval('.content-wrapper', el => el.textContent);
  console.log('Analytics text includes "Not available — run optimization"?', text.includes('Not available — run optimization'));

  // Find where that string appears
  const matchIdx = text.indexOf('Not available — run optimization');
  if (matchIdx !== -1) {
    console.log('Snippet around match:\n', text.substring(Math.max(0, matchIdx - 100), matchIdx + 150));
  }
  await browser.close();
}

checkReload().catch(console.error);
