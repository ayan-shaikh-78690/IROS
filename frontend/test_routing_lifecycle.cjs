const puppeteer = require('puppeteer');

async function testRoutingLifecycle() {
  console.log('=== ROUTING LIFECYCLE VERIFICATION TEST (ISSUE 0) ===');
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  page.setDefaultTimeout(20000);

  let passedSteps = 0;

  function assert(cond, msg) {
    if (cond) {
      console.log(`  [PASS] ${msg}`);
      passedSteps++;
    } else {
      console.error(`  [FAIL] ${msg}`);
      process.exitCode = 1;
    }
  }

  await page.goto('http://127.0.0.1:5173/scenario', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('button[title*="Calculate real road"]', { timeout: 10000 });

  // 1. Initial State
  await page.waitForFunction(() => {
    const el = document.querySelector('.scenario-summary-status');
    return el && el.textContent.includes('Road Route Ready');
  }, { timeout: 10000 });
  const initialDist = await page.$eval('.scenario-summary-val', el => el.textContent.trim());
  assert(initialDist === '33.05 km', `1. Initial route ready: ${initialDist}`);

  // 2. Click Recalculate route without changing anything
  const calcBtn = await page.$('button[title*="Calculate real road"]');
  await calcBtn.click();

  // Verify loading state appears or clears immediately
  await page.waitForFunction(() => {
    const el = document.querySelector('.scenario-summary-status');
    return el && el.textContent.includes('Road Route Ready');
  }, { timeout: 10000 });
  const reCalcDist = await page.$eval('.scenario-summary-val', el => el.textContent.trim());
  assert(reCalcDist === '33.05 km', `2. Recalculate without changes completed cleanly: ${reCalcDist}`);

  // 3. Add one delivery stop
  const nameInput = await page.$('input[placeholder="e.g. Navrangpura Distribution Point"]');
  const latInput = await page.$('input[aria-label="Stop latitude coordinate"]');
  const lngInput = await page.$('input[aria-label="Stop longitude coordinate"]');
  const addBtn = await page.$('#add-stop-btn');

  if (nameInput && latInput && lngInput && addBtn) {
    await nameInput.type('Test Sabarmati Stop');
    await latInput.click({ clickCount: 3 });
    await latInput.type('23.0800');
    await lngInput.click({ clickCount: 3 });
    await lngInput.type('72.5800');
    await addBtn.click();
    await new Promise(r => setTimeout(r, 1000));

    // Calculate with new stop
    await page.waitForSelector('button[title*="Calculate real road"]:not([disabled])', { timeout: 5000 });
    const btnAfterAdd = await page.$('button[title*="Calculate real road"]');
    await btnAfterAdd.click();

    await page.waitForFunction(() => {
      const el = document.querySelector('.scenario-summary-status');
      return el && el.textContent.includes('Road Route Ready');
    }, { timeout: 15000 });

    const dist5Stops = await page.$eval('.scenario-summary-val', el => el.textContent.trim());
    assert(dist5Stops !== '—' && dist5Stops.includes('km'), `3. Added stop & recalculated route: ${dist5Stops}`);

    // 4. Remove that stop
    const deleteBtns = await page.$$('button[aria-label*="Delete delivery stop"]');
    if (deleteBtns.length > 0) {
      await deleteBtns[deleteBtns.length - 1].click();
      await new Promise(r => setTimeout(r, 1000));

      await page.waitForSelector('button[title*="Calculate real road"]:not([disabled])', { timeout: 5000 });
      const btnAfterDel = await page.$('button[title*="Calculate real road"]');
      await btnAfterDel.click();

      await page.waitForFunction(() => {
        const el = document.querySelector('.scenario-summary-status');
        return el && el.textContent.includes('Road Route Ready');
      }, { timeout: 15000 });

      const distAfterDel = await page.$eval('.scenario-summary-val', el => el.textContent.trim());
      assert(distAfterDel !== '—' && distAfterDel.includes('km'), `4. Removed stop & recalculated route: ${distAfterDel}`);
    }
  }

  // 5. Toggle round-trip
  const rtCheckbox = await page.$('input[type="checkbox"][id*="round-trip"], input[type="checkbox"]');
  if (rtCheckbox) {
    await rtCheckbox.click();
    await new Promise(r => setTimeout(r, 1000));

    const btnAfterRt = await page.$('button[title*="Calculate real road"]:not([disabled])');
    if (btnAfterRt) {
      await btnAfterRt.click();
      await page.waitForFunction(() => {
        const el = document.querySelector('.scenario-summary-status');
        return el && el.textContent.includes('Road Route Ready');
      }, { timeout: 15000 });
      const distRt = await page.$eval('.scenario-summary-val', el => el.textContent.trim());
      assert(distRt !== '—' && distRt.includes('km'), `5. Toggled round-trip & recalculated route: ${distRt}`);
    }
  }

  // Verify button is NOT stuck in calculating
  const finalBtnText = await page.$eval('button[title*="Calculate real road"]', el => el.textContent.trim());
  assert(!finalBtnText.includes('Calculating'), `6. Final button state is normal: "${finalBtnText}" (not stuck)`);

  await browser.close();
  console.log(`\nResult: ${passedSteps} routing lifecycle checks passed!`);
}

testRoutingLifecycle().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
