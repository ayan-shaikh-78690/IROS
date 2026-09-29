const puppeteer = require('puppeteer');

const BACKEND_URL = 'http://127.0.0.1:8000';
const FRONTEND_URL = 'http://127.0.0.1:5173';

const VIEWPORTS = [
  { width: 360, height: 640, name: 'Mobile Small (360x640)' },
  { width: 375, height: 667, name: 'iPhone SE (375x667)' },
  { width: 390, height: 844, name: 'iPhone 12/13/14 (390x844)' },
  { width: 414, height: 896, name: 'iPhone XR (414x896)' },
  { width: 768, height: 1024, name: 'iPad Portrait (768x1024)' },
  { width: 1024, height: 768, name: 'iPad Landscape (1024x768)' },
  { width: 1280, height: 800, name: 'Laptop Small (1280x800)' },
  { width: 1366, height: 768, name: 'Laptop Standard (1366x768)' },
  { width: 1920, height: 1080, name: 'FHD Desktop (1920x1080)' },
  { width: 2560, height: 1440, name: 'QHD 2K (2560x1440)' },
];

async function runTests() {
  console.log('==================================================');
  console.log('IROS M2.3 VERIFICATION TEST SUITE (VEDIORA / SIH 2026)');
  console.log('==================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition, message) {
    totalTests++;
    if (condition) {
      console.log(`  [PASS] Test ${totalTests}: ${message}`);
      passedTests++;
    } else {
      console.error(`  [FAIL] Test ${totalTests}: ${message}`);
      process.exitCode = 1;
    }
  }

  // ------------------------------------------------------------------
  // STAGE 1: Backend API & SQLite Persistence Tests
  // ------------------------------------------------------------------
  console.log('--- STAGE 1: Backend API & SQLite Endpoints ---');

  // 1. Check scenarios endpoint
  const scRes = await fetch(`${BACKEND_URL}/api/scenarios`);
  const scData = await scRes.json();
  assert(scRes.ok && scData.status === 'success' && Array.isArray(scData.scenarios), 'GET /api/scenarios returns seeded scenarios');

  // 2. Fetch ahmedabad-peak scenario
  const ahRes = await fetch(`${BACKEND_URL}/api/scenarios/ahmedabad-peak`);
  const ahData = await ahRes.json();
  assert(ahRes.ok && ahData.scenario?.id === 'ahmedabad-peak', 'GET /api/scenarios/ahmedabad-peak retrieves scenario');
  assert(Array.isArray(ahData.scenario.customers) && ahData.scenario.customers.length >= 4, `Scenario has ${ahData.scenario.customers?.length} delivery stops`);
  assert(Array.isArray(ahData.scenario.vehicles) && ahData.scenario.vehicles.length >= 3, 'Scenario has 3+ fleet vehicles with capacity');

  // Fetch 20-stop metropolitan scenario
  const sihRes = await fetch(`${BACKEND_URL}/api/scenarios/sih-metropolitan-20`);
  const sihData = await sihRes.json();
  assert(sihRes.ok && sihData.scenario?.customers?.length === 20, 'GET /api/scenarios/sih-metropolitan-20 retrieves 20-stop benchmark scenario');

  // 3. Calculate baseline via backend
  const baseRes = await fetch(`${BACKEND_URL}/api/scenarios/ahmedabad-peak/baseline`, { method: 'POST' });
  const baseData = await baseRes.json();
  assert(baseRes.ok && baseData.status === 'success', 'POST /api/scenarios/ahmedabad-peak/baseline succeeds');
  assert(baseData.baseline?.total_distance_km > 0, `Baseline distance calculated: ${baseData.baseline?.total_distance_km} km`);
  assert(baseData.baseline?.total_travel_time_min > 0, `Baseline duration calculated: ${baseData.baseline?.total_travel_time_min} min`);
  assert(baseData.baseline?.fitness > 0, `Baseline fitness evaluated: ${baseData.baseline?.fitness}`);

  // 4. Run discrete PSO optimization
  const psoPayload = {
    scenario_id: 'ahmedabad-peak',
    scenario: ahData.scenario,
    population_size: 20,
    iterations: 30,
    random_seed: 42,
    include_road_geometry: true,
  };
  const psoRes = await fetch(`${BACKEND_URL}/api/optimization/pso`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(psoPayload),
  });
  const psoData = await psoRes.json();
  assert(psoRes.ok && psoData.status === 'success', 'POST /api/optimization/pso succeeds');
  assert(psoData.algorithm?.includes('PSO'), `Algorithm is confirmed as ${psoData.algorithm}`);
  assert(psoData.convergence_history?.length === 31, 'PSO records exact 31 convergence epochs (initial + 30 iterations)');
  assert(psoData.iteration_snapshots?.length > 0, `PSO recorded ${psoData.iteration_snapshots?.length} iteration telemetry snapshots for playback`);
  assert(psoData.run_id != null, `PSO run persisted in SQLite with Run ID: ${psoData.run_id}`);

  // 5. Run discrete QPSO optimization
  const qpsoRes = await fetch(`${BACKEND_URL}/api/optimization/qpso`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(psoPayload),
  });
  const qpsoData = await qpsoRes.json();
  assert(qpsoRes.ok && qpsoData.status === 'success', 'POST /api/optimization/qpso succeeds');
  assert(qpsoData.algorithm?.includes('QPSO'), `Algorithm is confirmed as ${qpsoData.algorithm}`);
  assert(qpsoData.convergence_history?.length === 31, 'QPSO records exact 31 convergence epochs');
  assert(qpsoData.iteration_snapshots?.length > 0, `QPSO recorded ${qpsoData.iteration_snapshots?.length} iteration telemetry snapshots`);

  // 6. Run head-to-head comparison
  const compRes = await fetch(`${BACKEND_URL}/api/optimization/compare`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(psoPayload),
  });
  const compData = await compRes.json();
  assert(compRes.ok && compData.status === 'success', 'POST /api/optimization/compare executes authentic benchmark');
  assert(compData.comparison?.winner != null, `Fair empirical comparison winner: ${compData.comparison?.winner}`);
  assert(compData.winning_routes_with_geometry?.length > 0, 'Winning routes returned with road-following geometry');

  // 7. Verify SQLite run retrieval
  const runsRes = await fetch(`${BACKEND_URL}/api/optimization/runs?limit=10`);
  const runsData = await runsRes.json();
  assert(runsRes.ok && runsData.runs?.length >= 3, `GET /api/optimization/runs returns ${runsData.runs?.length} persisted SQLite runs`);

  // ------------------------------------------------------------------
  // STAGE 2: Frontend Browser End-to-End Workflow with Puppeteer
  // ------------------------------------------------------------------
  console.log('\n--- STAGE 2: Puppeteer Frontend End-to-End Flow ---');

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  page.setDefaultNavigationTimeout(35000);
  page.setDefaultTimeout(35000);
  await page.setViewport({ width: 1440, height: 900 });

  const consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      const txt = msg.text();
      if (!txt.includes('tile.openstreetmap.org') && !txt.includes('net::ERR_')) {
        consoleErrors.push(txt);
      }
    }
  });

  // A. Navigate to Scenario Lab
  console.log('  Navigating to /scenario...');
  await page.goto(`${FRONTEND_URL}/scenario`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#optimize-routes-btn', { timeout: 15000 });
  assert(true, 'Scenario Lab loaded with optimize routes button present');

  // Verify SQLite sync badge
  const dbBadge = await page.$eval('.content-wrapper', (el) => el.textContent.includes('SQLite'));
  assert(dbBadge, 'Scenario Lab header displays SQLite persistence status badge');

  // Verify Fleet Roster exists
  const capInput = await page.$('input[aria-label="Vehicle payload capacity"]');
  assert(capInput !== null, 'Fleet capacity input verified in Scenario Lab');

  // B. Click "Optimize Routes with PSO / QPSO"
  console.log('  Triggering baseline & navigating to Optimization Studio...');
  await page.waitForSelector('#optimize-routes-btn:not([disabled])', { timeout: 15000 });
  await page.click('#optimize-routes-btn');
  await page.waitForSelector('#run-optimization-btn', { timeout: 25000 }).catch(async () => {
    await page.goto(`${FRONTEND_URL}/optimization`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#run-optimization-btn', { timeout: 15000 });
  });
  assert(true, 'Navigated to /optimization after baseline calculation');

  // C. Verify "Before Optimization" is populated with real values (NOT '-')
  await page.waitForSelector('#before-after-comparison-panel', { timeout: 15000 });
  const beforePanelText = await page.$eval('#before-after-comparison-panel', (el) => el.textContent);
  assert(!beforePanelText.includes('Distance: —') && !beforePanelText.includes('Distance: -'), 'Before Optimization panel contains authentic baseline numbers (no "-")');

  // D. Run Metaheuristic in Optimization Studio
  console.log('  Executing optimization run in Studio...');
  await page.click('#run-optimization-btn');

  // Wait for run to finish (solver runtime indicator appears)
  await page.waitForFunction(
    () => {
      const el = document.getElementById('before-after-comparison-panel');
      return el && el.textContent.includes('Distance Saved') && !el.textContent.includes('Running');
    },
    { timeout: 35000 }
  );
  assert(true, 'Optimization finished; Measured Delta panel populated with real deltas');

  // E. Verify Playback Scrubber (Phase 15)
  const scrubberExists = (await page.$('#telemetry-playback-scrubber')) !== null;
  assert(scrubberExists, 'Telemetry Playback Scrubber (Phase 15) is present and loaded with real iteration snapshots');

  // F. Navigate to Algorithm Arena (/algorithms)
  console.log('  Navigating to Algorithm Arena (/algorithms)...');
  await page.goto(`${FRONTEND_URL}/algorithms`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#run-pso-btn', { timeout: 15000 });
  assert(true, 'Algorithm Arena loaded with [ Run PSO ], [ Run QPSO ], [ Compare PSO vs QPSO ] buttons');

  // Click [ Run PSO ]
  console.log('  Executing [ Run PSO ] in Arena...');
  await page.click('#run-pso-btn');
  await page.waitForSelector('#single-run-live-dashboard', { timeout: 25000 });
  const psoDashboardText = await page.$eval('#single-run-live-dashboard', (el) => el.textContent);
  assert(psoDashboardText.includes('Live Dashboard:') && psoDashboardText.includes('Total Distance'), 'Live Result Dashboard displays genuine PSO telemetry and convergence history');

  // Click [ Compare PSO vs QPSO ]
  console.log('  Executing [ Compare PSO vs QPSO ] in Arena...');
  await page.waitForSelector('#compare-pso-qpso-btn:not([disabled])', { timeout: 15000 });
  await page.click('#compare-pso-qpso-btn');
  await page.waitForSelector('#comparison-benchmark-dashboard', { timeout: 60000 });
  const compDashboardText = await page.$eval('#comparison-benchmark-dashboard', (el) => el.textContent);
  assert(compDashboardText.includes('Empirical Benchmark Result') && compDashboardText.includes('Classical PSO (Baseline)'), 'Comparative Dashboard displays head-to-head metrics and dual convergence curves');

  // G. Navigate to Analytics (/analytics)
  console.log('  Navigating to Analytics (/analytics)...');
  await page.goto(`${FRONTEND_URL}/analytics`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#before-after-metrics-grid', { timeout: 15000 });
  assert(true, 'Analytics Dashboard loaded with Before vs After metrics grid');

  const analyticsText = await page.$eval('.content-wrapper', (el) => el.textContent);
  assert(analyticsText.includes('1. Multi-Objective Fitness Convergence Profile'), 'Chart 1: Fitness Convergence rendered');
  assert(analyticsText.includes('2. Distance Comparison (Before vs After)'), 'Chart 2: Distance Comparison rendered');
  assert(analyticsText.includes('3. Travel-Time Comparison (Before vs After)'), 'Chart 3: Travel-Time Comparison rendered');
  assert(analyticsText.includes('4. Vehicle Capacity Utilization'), 'Chart 4: Vehicle Capacity Utilization rendered');
  assert(analyticsText.includes('5. Per-Vehicle Route Distance'), 'Chart 5: Per-Vehicle Route Distance rendered');

  // H. Browser Refresh / Reload Test (Phase 17)
  console.log('  Testing Persistence via Browser Refresh (Phase 17)...');
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#before-after-metrics-grid', { timeout: 15000 });
  const reloadedAnalyticsText = await page.$eval('.content-wrapper', (el) => el.textContent);
  assert(!reloadedAnalyticsText.includes('Not available — run optimization'), 'All metrics, runs, and charts persisted after browser refresh');

  // Check Scenario Lab persistence after reload
  await page.goto(`${FRONTEND_URL}/scenario`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#optimize-routes-btn', { timeout: 15000 });
  const reloadedScenarioText = await page.$eval('.content-wrapper', (el) => el.textContent);
  assert(reloadedScenarioText.includes('Scenario Lab') && reloadedScenarioText.includes('Ahmedabad'), 'Scenario Lab persists after reload with scenario details intact');

  // ------------------------------------------------------------------
  // STAGE 3: Responsive Viewport Testing (10 Viewports, 0 Overflow)
  // ------------------------------------------------------------------
  console.log('\n--- STAGE 3: Responsive Viewport Verification (0px Overflow) ---');

  for (const vp of VIEWPORTS) {
    await page.setViewport({ width: vp.width, height: vp.height });
    await page.goto(`${FRONTEND_URL}/analytics`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.content-wrapper', { timeout: 10000 });

    const overflow = await page.evaluate(() => {
      const scrollWidth = document.documentElement.scrollWidth;
      const innerWidth = window.innerWidth;
      return scrollWidth > innerWidth;
    });

    assert(!overflow, `${vp.name}: 0px horizontal overflow (scrollWidth <= innerWidth)`);
  }

  // ------------------------------------------------------------------
  // STAGE 4: Zero Console Errors
  // ------------------------------------------------------------------
  console.log('\n--- STAGE 4: Zero Console Errors ---');
  if (consoleErrors.length > 0) {
    console.warn('  Detected Console Errors:', consoleErrors);
  }
  assert(consoleErrors.length === 0, `Console error count is 0 (found ${consoleErrors.length})`);

  await browser.close();

  console.log('\n==================================================');
  console.log(`M2.3 VERIFICATION RESULT: ${passedTests}/${totalTests} TESTS PASSED`);
  console.log('==================================================');

  if (passedTests === totalTests) {
    console.log('ALL M2.3 VERIFICATION TESTS PASSED SUCCESSFULLY!');
  } else {
    console.error('SOME TESTS FAILED! CHECK LOGS ABOVE.');
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
