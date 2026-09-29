const puppeteer = require('puppeteer');

async function debugCompare() {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();

  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.type(), msg.text()));
  page.on('requestfailed', req => console.log('REQ FAILED:', req.url(), req.failure().errorText));
  page.on('response', async res => {
    if (res.url().includes('/api/optimization')) {
      try {
        const text = await res.text();
        console.log(`API [${res.status()}] ${res.url()}:`, text.slice(0, 300));
      } catch (e) {}
    }
  });

  console.log('1. Navigating to /algorithms...');
  await page.goto('http://127.0.0.1:5173/algorithms', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#compare-pso-qpso-btn', { timeout: 10000 });

  console.log('2. Clicking #compare-pso-qpso-btn...');
  await page.click('#compare-pso-qpso-btn');

  // Wait 10 seconds and check state
  for (let s = 1; s <= 15; s++) {
    await new Promise(r => setTimeout(r, 2000));
    const info = await page.evaluate(() => {
      const btn = document.querySelector('#compare-pso-qpso-btn')?.innerText;
      const err = document.querySelector('.content-wrapper [style*="239, 68, 68"]')?.innerText;
      const compDash = document.querySelector('#comparison-benchmark-dashboard');
      const singleDash = document.querySelector('#single-run-live-dashboard');
      return { btn, err, hasCompDash: !!compDash, hasSingleDash: !!singleDash };
    });
    console.log(`[t=${s*2}s]`, info);
    if (info.hasCompDash || info.err) break;
  }

  await browser.close();
}

debugCompare().catch(console.error);
