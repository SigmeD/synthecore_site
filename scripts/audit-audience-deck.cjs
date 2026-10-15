const fs = require('node:fs/promises');
const path = require('node:path');
const { chromium } = require(require.resolve('playwright-core', { paths: [process.cwd(), process.env.USERPROFILE] }));
const output = path.resolve(__dirname, '../output/playwright/audience-deck');
const after = process.argv.includes('--after');
const mode = after ? 'after' : 'before';

async function measure(page) {
  return page.locator('#audiences').evaluate(section => {
    const box = node => { const r = node.getBoundingClientRect(), s = getComputedStyle(node);
      return { x: r.x, y: r.y, width: r.width, height: r.height, padding: s.padding, transform: s.transform }; };
    return { viewport: [innerWidth, innerHeight], section: box(section),
      cards: [...section.querySelectorAll('.audience-card')].map(node => ({
        active: node.classList.contains('is-active'), card: box(node), image: box(node.querySelector('img')),
        title: box(node.querySelector('h3')), copy: box(node.querySelector('p')),
      })), overflow: document.documentElement.scrollWidth > innerWidth + 1,
      scroll: window.__synthecoreScrollQA.getState() };
  });
}

(async () => {
  await fs.mkdir(output, { recursive: true });
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
  const report = { mode, local: [], reference: [] };
  try {
    for (const [width, height] of [[1366,768],[1920,1080],[390,844]]) {
      const context = await browser.newContext({ viewport: { width, height }, isMobile: width < 850, hasTouch: width < 850 });
      try {
        const page = await context.newPage();
        if (!after) {
          const baseline = path.resolve(__dirname, '../backup/audience-deck-before-2026-10-14');
          const files = { '/': 'index.html', '/index.html': 'index.html', '/css/main.css': 'main.css', '/js/main.js': 'main.js' };
          await page.route('**/*', async route => {
            const file = files[new URL(route.request().url()).pathname];
            if (!file) return route.continue();
            const contentType = file.endsWith('.css') ? 'text/css' : file.endsWith('.js') ? 'application/javascript' : 'text/html';
            await route.fulfill({ body: await fs.readFile(path.join(baseline, file)), contentType });
          });
        }
        await page.goto('http://127.0.0.1:4173/');
        await page.waitForFunction(() => window.__synthecoreScrollQA?.getState().ready);
        await page.evaluate(() => scrollTo(0, document.querySelector('#audiences').getBoundingClientRect().top + scrollY - 120));
        await page.waitForTimeout(700);
        const entry = { viewport: `${width}x${height}`, categories: [] };
        for (let i = 0; i < 3; i++) {
          await page.evaluate(() => scrollTo(0, document.querySelector('#audiences').getBoundingClientRect().top + scrollY - 120));
          await page.waitForTimeout(700);
          const button = page.locator('.audience-option').nth(i);
          if (width < 850) await button.tap(); else await button.hover();
          await page.waitForTimeout(850);
          entry.categories.push(await measure(page));
          // Full-page capture temporarily expands the browser's layout viewport.
          // Freeze only the audience observer so screenshots keep the chosen card.
          await page.evaluate(() => window.ScrollTrigger?.getById('synthecore-audiences')?.disable(false));
          await page.screenshot({ path: path.join(output, `${mode}-${width}x${height}-${i}.png`) });
          const clip = await page.locator('#audiences').evaluate(node => {
            const r = node.getBoundingClientRect(); return { x: r.x + scrollX, y: r.y + scrollY, width: r.width, height: r.height };
          });
          await page.screenshot({ path: path.join(output, `${mode}-${width}x${height}-${i}-section.png`), fullPage: true, clip,
            style: '#floatingHeader { visibility: hidden !important; }' });
          await page.evaluate(() => window.ScrollTrigger?.getById('synthecore-audiences')?.enable(false, false));
        }
        report.local.push(entry);
      } finally { await context.close(); }
    }
    if (!after) {
      const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
      try {
        const page = await context.newPage();
        await page.goto('https://www.roveia.com/', { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.getByRole('heading', { name: 'Who We Work With', exact: true }).waitFor();
        await page.waitForTimeout(2000);
        await page.evaluate(() => {
          const heading = [...document.querySelectorAll('h2')].find(n => n.textContent.trim() === 'Who We Work With');
          const target = heading.getBoundingClientRect().top + scrollY - 120;
          if (window.lenis) window.lenis.scrollTo(target, { immediate: true, force: true }); else scrollTo(0, target);
        });
        await page.waitForTimeout(1000);
        for (let i = 0; i < 3; i++) {
          await page.locator('.section_home-where-we-work .heading-12.linked').nth(i).hover();
          await page.waitForTimeout(1000);
          await page.screenshot({ path: path.join(output, `roveia-1920x1080-${i}.png`) });
          report.reference.push(await page.locator('.section_home-where-we-work .flex-block-47').nth(i).evaluate(node => {
            const box = element => { const r = element.getBoundingClientRect(), s = getComputedStyle(element);
              return { width: r.width, height: r.height, padding: s.padding, transform: s.transform, background: s.backgroundImage }; };
            return { card: box(node), image: box(node.querySelector('img')), title: box(node.querySelector('h4')) };
          }));
        }
      } catch (error) { report.referenceError = error.message; }
      finally { await context.close(); }
    }
    await fs.writeFile(path.join(output, `${mode}-metrics.json`), JSON.stringify(report, null, 2));
    console.log(JSON.stringify({ mode, local: report.local.map(entry => ({ viewport: entry.viewport,
      card: entry.categories[0].cards[0].card, image: entry.categories[0].cards[0].image })), reference: report.reference, referenceError: report.referenceError }, null, 2));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
