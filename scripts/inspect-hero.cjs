const fs = require('node:fs/promises');
const path = require('node:path');
const { chromium } = require(require.resolve('playwright-core', { paths: [process.cwd(), process.env.USERPROFILE] }));
(async () => {
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
  const context = await browser.newContext({ viewport: { width: Number(process.argv[2] || 1366), height: Number(process.argv[3] || 768) } });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:4173/', { waitUntil: 'load' });
  await page.waitForFunction(() => window.__synthecoreScrollQA?.getState().ready);
  if (process.argv[4]) {
    const delta = await page.evaluate(progress => window.__synthecoreScrollQA.getPinDistance() * progress, Number(process.argv[4]));
    await page.mouse.wheel(0, delta);
    await page.waitForTimeout(1850);
  }
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.resolve(__dirname, '../output/playwright/hero-debug.png') });
  const data = await page.evaluate(() => {
    const rect = node => { const r = node.getBoundingClientRect(), c = getComputedStyle(node); return {
      tag: node.tagName, id: node.id, classes: node.className, x: r.x, y: r.y, width: r.width, height: r.height,
      position: c.position, cssWidth: c.width, transform: c.transform, clip: c.clipPath,
    }; };
    return { qa: window.__synthecoreScrollQA.getState(),
      counts: ['#floatingHeader','#top','#imageScrollSticky','.hero','.pin-spacer','.photo'].map(selector => ({ selector, count: document.querySelectorAll(selector).length })),
      bodyChildren: [...document.body.children].map(rect),
      nodes: [...document.querySelectorAll('.hero,#imageScrollSticky,.pin-spacer,.photo,.hero-head,.floating-header,.hero-image-expander img')].map(rect),
      html: document.body.innerHTML,
    };
  });
  await fs.writeFile(path.resolve(__dirname, '../output/playwright/hero-debug.json'), JSON.stringify(data, null, 2));
  console.log(JSON.stringify({ qa: data.qa, counts: data.counts, bodyChildren: data.bodyChildren, nodes: data.nodes }, null, 2));
  await context.close();
  await browser.close();
})().catch(error => { console.error(error); process.exitCode = 1; });
