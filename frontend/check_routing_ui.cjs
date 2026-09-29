const puppeteer = require('puppeteer');

async function check() {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();

  const requests = [];
  page.on('request', req => {
    if (req.url().includes('/routes/calculate')) {
      requests.push({ url: req.url(), method: req.method(), time: Date.now() });
    }
  });

  console.log('Navigating to http://127.0.0.1:5173/scenario...');
  await page.goto('http://127.0.0.1:5173/scenario', { waitUntil: 'domcontentloaded' });

  // Wait 3 seconds
  await new Promise(r => setTimeout(r, 3000));

  const state1 = await page.evaluate(() => {
    const summaryStatus = document.querySelector('.scenario-summary-status')?.textContent?.trim();
    const mainBtn = document.querySelector('.scenario-summary-grid')?.parentElement?.querySelector('button.btn-primary')?.textContent?.trim();
    const mapToolbar = document.querySelector('.map-layer-controls')?.textContent?.trim();
    const dist = document.querySelector('.scenario-summary-val')?.textContent?.trim();
    return { summaryStatus, mainBtn, mapToolbar, dist };
  });

  console.log('Initial State after load:', state1);
  console.log('Requests count to /routes/calculate in first 3s:', requests.length);

  // Wait another 3 seconds to see if requests keep firing
  await new Promise(r => setTimeout(r, 3000));
  console.log('Requests count after 6s:', requests.length);

  const state2 = await page.evaluate(() => {
    const summaryStatus = document.querySelector('.scenario-summary-status')?.textContent?.trim();
    const mainBtn = document.querySelector('.scenario-summary-grid')?.parentElement?.querySelector('button.btn-primary')?.textContent?.trim();
    return { summaryStatus, mainBtn };
  });
  console.log('State after 6s:', state2);

  await browser.close();
}

check().catch(console.error);
