const fs = require('node:fs/promises');
const path = require('node:path');
const { chromium } = require(require.resolve('playwright-core', { paths: [process.cwd(), process.env.USERPROFILE] }));
const output = path.resolve(__dirname, '../output/playwright/audiences');
const mode = process.argv.includes('--after') ? 'after' : 'before';

async function localMetrics(page) {
  return page.evaluate(() => {
    const box = node => {
      const r = node.getBoundingClientRect(), s = getComputedStyle(node);
      return { x: r.x, y: r.y, width: r.width, height: r.height, bottom: r.bottom, right: r.right,
        fontSize: s.fontSize, fontWeight: s.fontWeight, lineHeight: s.lineHeight, marginBottom: s.marginBottom,
        padding: s.padding, position: s.position, display: s.display, objectFit: s.objectFit,
        overflow: s.overflow, border: s.border, transform: s.transform };
    };
    const section = document.querySelector('#audiences');
    return { viewport: [innerWidth, innerHeight], section: box(section), container: box(section.querySelector('.audience-container')),
      heading: box(section.querySelector('h2')), list: box(section.querySelector('.audience-list')),
      rows: [...section.querySelectorAll('.audience-option')].map(node => ({ ...box(node), label: node.textContent.trim(), name: box(node.querySelector('.audience-name')) })),
      shell: box(section.querySelector('.audience-card-shell')), cards: [...section.querySelectorAll('.audience-card')].map(node => ({
        active: node.classList.contains('is-active'), card: box(node), image: box(node.querySelector('img')),
        title: box(node.querySelector('h3')), copy: box(node.querySelector('p')), tags: box(node.querySelector('.audience-tags')),
      })), overflow: document.documentElement.scrollWidth > innerWidth + 1 };
  });
}

(async () => {
  await fs.mkdir(output, { recursive: true });
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
  const referenceOnly = process.argv.includes('--reference-only');
  const report = referenceOnly ? JSON.parse(await fs.readFile(path.join(output, 'before-metrics.json'), 'utf8')) : { mode, local: [], reference: null };
  try {
    for (const [width, height] of referenceOnly ? [] : [[1366, 768], [1920, 1080], [3840, 2160], [390, 844], [430, 932]]) {
      const mobile = width < 850;
      const context = await browser.newContext({ viewport: { width, height }, isMobile: mobile, hasTouch: mobile });
      try {
        const page = await context.newPage();
        await page.goto('http://127.0.0.1:4173/');
        await page.waitForFunction(() => window.__synthecoreScrollQA?.getState().ready);
        await page.waitForTimeout(500);
        await page.evaluate(() => {
          const target = document.querySelector('#audiences').getBoundingClientRect().top + scrollY - 120;
          scrollTo(0, target);
        });
        await page.waitForTimeout(700);
        await page.screenshot({ path: path.join(output, `${mode}-${width}x${height}-closed.png`) });
        const entry = { viewport: `${width}x${height}`, closed: await localMetrics(page), active: [] };
        for (let i = 0; i < 3; i++) {
          const row = page.locator('.audience-option').nth(i);
          if (mobile) await row.tap(); else await row.hover();
          await page.waitForTimeout(900);
          await page.screenshot({ path: path.join(output, `${mode}-${width}x${height}-${i}.png`), fullPage: mobile });
          entry.active.push(await localMetrics(page));
        }
        report.local.push(entry);
      } finally { await context.close(); }
    }
    if (mode === 'before') {
      const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
      try {
        const page = await context.newPage();
        await page.goto('https://www.roveia.com/', { waitUntil: 'domcontentloaded', timeout: 25000 });
        await page.waitForTimeout(3000);
        const heading = page.getByRole('heading', { name: 'Who We Work With', exact: true });
        await heading.waitFor();
        report.reference = await heading.evaluate(node => {
          const nodes = [];
          for (let parent = node, depth = 0; parent && depth < 6; parent = parent.parentElement, depth++) {
            const s = getComputedStyle(parent), r = parent.getBoundingClientRect();
            nodes.push({ tag: parent.tagName, class: parent.className, text: parent.innerText.slice(0, 1000), html: parent.outerHTML.slice(0, 12000),
              width: r.width, height: r.height, fontSize: s.fontSize, lineHeight: s.lineHeight, marginBottom: s.marginBottom,
              display: s.display, grid: s.gridTemplateColumns, gap: s.gap });
          }
          return nodes;
        });
        await page.evaluate(() => {
          const node = [...document.querySelectorAll('h1,h2,h3')].find(n => n.textContent.trim() === 'Who We Work With');
          const target = node.getBoundingClientRect().top + scrollY - 120;
          if (window.lenis) window.lenis.scrollTo(target, { immediate: true, force: true }); else scrollTo(0, target);
        });
        await page.waitForTimeout(1200);
        await page.screenshot({ path: path.join(output, 'roveia-1920x1080.png') });
        report.referenceCards = [];
        for (let i = 0; i < 3; i++) {
          await page.locator('.section_home-where-we-work .heading-12.linked').nth(i).hover();
          await page.waitForTimeout(1200);
          report.referenceCards.push(await page.locator('.section_home-where-we-work .flex-block-47').nth(i).evaluate(node => {
            const box = element => { const s = getComputedStyle(element), r = element.getBoundingClientRect();
              return { width: r.width, height: r.height, padding: s.padding, fontSize: s.fontSize, lineHeight: s.lineHeight,
                position: s.position, display: s.display, gap: s.gap, objectFit: s.objectFit, transform: s.transform }; };
            return { card: box(node), image: box(node.querySelector('img')), title: box(node.querySelector('h4')), copy: box(node.querySelector('p')) };
          }));
          await page.screenshot({ path: path.join(output, `roveia-1920x1080-${i}.png`) });
        }
      } finally { await context.close(); }
    }
    await fs.writeFile(path.join(output, `${mode}-metrics.json`), JSON.stringify(report, null, 2));
    console.log(JSON.stringify({ mode, local: report.local.map(x => ({ viewport: x.viewport, heading: x.closed.heading.fontSize,
      headingGap: x.closed.heading.marginBottom, cardHeight: x.active[0].shell.height, imageHeight: x.active[0].cards[0].image.height })),
      reference: report.reference?.map(({ html, text, ...rest }) => rest), referenceCards: report.referenceCards }, null, 2));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
