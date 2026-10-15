const fs = require('node:fs/promises');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require(require.resolve('playwright-core', { paths: [process.cwd(), process.env.USERPROFILE] }));
const output = path.resolve(__dirname, '../output/playwright');
const results = { cases: [], errors: [] };
(async () => {
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = await context.newPage();
  page.on('pageerror', error => results.errors.push(error.message));
  const ready = async () => { await page.waitForFunction(() => window.__synthecoreScrollQA?.getState().ready); await page.waitForTimeout(500); };
  try {
    await page.goto('http://127.0.0.1:4173/'); await ready();
    const distance = await page.evaluate(() => window.__synthecoreScrollQA.getPinDistance());
    await page.mouse.wheel(0, distance * .55); await page.waitForTimeout(2100);
    await page.setViewportSize({ width: 1440, height: 900 }); await page.waitForTimeout(700);
    const resized = await page.evaluate(() => {
      const hero = document.querySelector('.hero'), photo = hero.querySelector('.hero-image-expander');
      const matrix = new DOMMatrix(getComputedStyle(photo.querySelector('img')).transform);
      return { heroWidth: hero.getBoundingClientRect().width, photoWidth: photo.getBoundingClientRect().width,
        scaleX: matrix.a, scaleY: matrix.d, spacers: document.querySelectorAll('.pin-spacer').length,
        qa: window.__synthecoreScrollQA.getState() };
    });
    assert.equal(resized.spacers, 1);
    assert.ok(Math.abs(resized.heroWidth - resized.photoWidth) < .1);
    assert.ok(Math.abs(resized.scaleX - resized.scaleY) < .0001);
    await page.screenshot({ path: path.join(output, 'resize-during-pin.png') });
    results.cases.push({ label: 'resize during active pin', status: 'passed', evidence: resized });

    await page.setViewportSize({ width: 1920, height: 1080 }); await page.waitForTimeout(700);
    await page.mouse.wheel(0, 20000); await page.waitForTimeout(2300);
    await page.mouse.wheel(0, -20000); await page.waitForTimeout(2300);
    const reversed = await page.evaluate(() => window.__synthecoreScrollQA.getState());
    assert.equal(reversed.scroll, 0); assert.ok(reversed.timelineProgress < .002);
    results.cases.push({ label: 'fast pin-boundary crossing and reverse', status: 'passed', evidence: reversed });

    await page.locator('.header-links a[href="#services"]').click(); await page.waitForTimeout(2100);
    assert.equal(await page.evaluate(() => document.activeElement.id), 'services');
    await page.goBack(); await page.waitForTimeout(1000);
    assert.equal(await page.evaluate(() => location.hash), '');
    assert.ok(await page.evaluate(() => scrollY < 2));
    await page.evaluate(() => {
      document.addEventListener('click', event => {
        if (event.ctrlKey) window.__modifiedClickPrevented = event.defaultPrevented;
      });
    });
    await page.locator('.header-links a[href="#services"]').click({ modifiers: ['Control'] });
    await page.waitForTimeout(500);
    assert.equal(await page.evaluate(() => window.__modifiedClickPrevented), false);
    for (const extra of context.pages()) if (extra !== page) await extra.close();
    assert.equal(await page.evaluate(() => location.hash), '');
    assert.ok(await page.evaluate(() => scrollY < 2));
    results.cases.push({ label: 'anchor focus, Back restoration, Ctrl-click retains native default', status: 'passed' });

    await page.goto('http://127.0.0.1:4173/#audiences'); await ready();
    const landing = await page.locator('#audiences').evaluate(node => node.getBoundingClientRect().top);
    assert.ok(landing >= 190 && landing <= 220);
    await page.locator('.audience-option').first().focus();
    await page.keyboard.press('ArrowDown');
    assert.equal(await page.locator('.audience-option.is-active').getAttribute('data-audience'), '1');
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('.audience-card.is-active').count(), 0);
    await page.locator('.audience-option').first().hover();
    assert.equal(await page.locator('.audience-card.is-active').count(), 1);
    await page.mouse.move(2, 2);
    assert.equal(await page.locator('.audience-card.is-active').count(), 0);
    results.cases.push({ label: 'initial deep hash, arrow keys, real hover and pointer leave', status: 'passed', landing });

    const mobile = await browser.newContext({ viewport: { width: 430, height: 932 }, isMobile: true, hasTouch: true });
    const mobilePage = await mobile.newPage();
    mobilePage.on('pageerror', error => results.errors.push(error.message));
    await mobilePage.goto('http://127.0.0.1:4173/');
    await mobilePage.waitForTimeout(700);
    const session = await mobile.newCDPSession(mobilePage);
    await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 180, y: 600 }] });
    for (let i = 1; i <= 12; i++) {
      await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 180, y: 600 - i * 25 }] });
      await mobilePage.waitForTimeout(25);
    }
    await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await mobilePage.waitForTimeout(600);
    const touchState = await mobilePage.evaluate(() => window.__synthecoreScrollQA.getState());
    assert.ok(touchState.scroll > 100);
    assert.equal(touchState.engine, 'native-mobile');
    assert.equal(touchState.smoothWheel, false);
    await mobilePage.setViewportSize({ width: 932, height: 430 }); await mobilePage.waitForTimeout(500);
    assert.equal(await mobilePage.evaluate(() => window.__synthecoreScrollQA.getEngine()), 'native-mobile');
    assert.ok(await mobilePage.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    results.cases.push({ label: 'native touch drag and landscape orientation', status: 'passed', evidence: touchState });
    await mobile.close();
    assert.deepEqual(results.errors, []);
    results.status = 'passed';
  } catch (error) { results.status = 'failed'; results.errors.push(error.message); process.exitCode = 1; }
  finally {
    await context.close(); await browser.close();
    await fs.writeFile(path.join(output, 'adversarial.json'), JSON.stringify(results, null, 2));
    console.log(JSON.stringify(results, null, 2));
  }
})();
