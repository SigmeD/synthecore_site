const fs = require('node:fs/promises');
const path = require('node:path');
const { chromium } = require(require.resolve('playwright-core', { paths: [process.cwd(), process.env.USERPROFILE] }));
const output = path.resolve(__dirname, '../output/playwright');
(async () => {
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = await context.newPage();
  const data = { url: 'https://www.roveia.com/', viewport: '1920x1080', frames: [], errors: [] };
  page.on('pageerror', error => data.errors.push(error.message));
  try {
    await page.goto(data.url, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForTimeout(3000);
    const scripts = await page.locator('script').evaluateAll(nodes => nodes.map(node => ({ src: node.src, text: node.src ? '' : node.textContent })));
    data.scripts = scripts.filter(script => script.src).map(script => script.src);
    await fs.writeFile(path.join(output, 'roveia-inline.js'), scripts.filter(script => /lenis|ScrollTrigger|gsap/i.test(script.text)).map(script => script.text).join('\n'));
    for (let i = 0; i < 6; i++) {
      data.frames.push(await page.evaluate(() => ({ scrollY,
        spacers: [...document.querySelectorAll('.pin-spacer')].map(node => ({ width: node.offsetWidth, height: node.offsetHeight })),
        triggers: window.ScrollTrigger?.getAll?.().map(trigger => ({ start: trigger.start, end: trigger.end, progress: trigger.progress, scrub: trigger.vars.scrub, pin: Boolean(trigger.pin) })) ?? [],
      })));
      await page.screenshot({ path: path.join(output, `roveia-${i}.png`) });
      await page.mouse.wheel(0, 250);
      await page.waitForTimeout(1600);
    }
    data.status = 'captured';
  } catch (error) { data.status = 'failed'; data.errors.push(error.message); process.exitCode = 1; }
  finally {
    await fs.writeFile(path.join(output, 'reference.json'), JSON.stringify(data, null, 2));
    console.log(JSON.stringify({ status: data.status, errors: data.errors, frames: data.frames, scripts: data.scripts }, null, 2));
    await context.close(); await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
