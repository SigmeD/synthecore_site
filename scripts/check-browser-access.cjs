const fs = require('node:fs/promises');
const path = require('node:path');
const output = path.resolve(__dirname, '../output/playwright');
const endpoint = process.env.PLAYWRIGHT_CDP_URL || 'http://127.0.0.1:9222';
const report = { date: new Date().toISOString(), endpoint, status: 'unavailable', errors: [] };

(async () => {
  await fs.mkdir(output, { recursive: true });
  let browser, context;
  try {
    const versionResponse = await fetch(`${endpoint.replace(/\/$/, '')}/json/version`, { signal: AbortSignal.timeout(3000) });
    if (!versionResponse.ok) throw new Error(`CDP discovery HTTP ${versionResponse.status}`);
    const version = await versionResponse.json();
    if (!version.webSocketDebuggerUrl) throw new Error('CDP discovery has no browser WebSocket endpoint');
    report.browser = version.Browser;
    let playwright;
    try { playwright = require('playwright'); }
    catch { playwright = require(require.resolve('playwright-core', { paths: [process.cwd(), process.env.USERPROFILE || ''] })); }
    // New isolated context; existing browser tabs are not inspected.
    browser = await playwright.chromium.connectOverCDP(endpoint, { timeout: 8000 });
    context = await browser.newContext({ viewport: { width: 1366, height: 768 } });
    const page = await context.newPage();
    page.on('pageerror', error => report.errors.push(error.message));
    await page.goto('http://127.0.0.1:4173/', { waitUntil: 'load', timeout: 15000 });
    await page.waitForFunction(() => window.__synthecoreScrollQA?.getState?.().ready, null, { timeout: 5000 });
    report.page = await page.evaluate(() => ({ title: document.title, url: location.href, engine: window.__synthecoreScrollQA.getEngine() }));
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(output, 'chromium-access.png') });
    report.screenshot = 'output/playwright/chromium-access.png';
    report.status = 'connected';
  } catch (error) {
    report.errors.push(error.message);
    if (error.cause) report.errors.push(error.cause.message);
    process.exitCode = 1;
  } finally {
    await context?.close();
    // For connectOverCDP, close disconnects this client; the remote browser stays.
    await browser?.close();
    await fs.writeFile(path.join(output, 'browser-access.json'), JSON.stringify(report, null, 2) + '\n');
    console.log(JSON.stringify(report, null, 2));
  }
})();
