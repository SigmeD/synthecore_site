const fs = require('node:fs/promises');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require(require.resolve('playwright-core', { paths: [process.cwd(), process.env.USERPROFILE] }));
const output = path.resolve(__dirname, '../output/playwright/audiences');
const results = { date: new Date().toISOString(), cases: [], errors: [] };
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));

async function geometry(page) {
  return page.evaluate(() => {
    const section = document.querySelector('#audiences'), container = section.querySelector('.audience-container');
    const heading = section.querySelector('h2'), list = section.querySelector('.audience-list');
    const active = section.querySelector('.audience-card.is-active'), shell = section.querySelector('.audience-card-shell');
    const rect = node => { const r = node.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height, right: r.right, bottom: r.bottom }; };
    const textRects = [...section.querySelectorAll('.audience-name')].flatMap(node => {
      const range = document.createRange(); range.selectNodeContents(node);
      return [...range.getClientRects()].map(r => ({ x: r.x, right: r.right }));
    });
    return { viewport: [innerWidth, innerHeight], display: getComputedStyle(container).display, columns: getComputedStyle(container).gridTemplateColumns,
      heading: { ...rect(heading), size: parseFloat(getComputedStyle(heading).fontSize), lineHeight: parseFloat(getComputedStyle(heading).lineHeight),
        margin: parseFloat(getComputedStyle(heading).marginBottom) }, list: rect(list), container: rect(container), shell: rect(shell), shellHeight: shell.offsetHeight,
      actionCount: section.querySelectorAll('.audience-option-action').length, overflow: document.documentElement.scrollWidth > innerWidth + 1,
      labelsFit: textRects.every(r => r.x >= list.getBoundingClientRect().left - 1 && r.right <= list.getBoundingClientRect().right + 1),
      paddingBottom: parseFloat(getComputedStyle(section).paddingBottom),
      labelWeight: parseFloat(getComputedStyle(section.querySelector('.audience-name')).fontWeight),
      active: active ? {
        index: [...section.querySelectorAll('.audience-card')].indexOf(active), height: active.clientHeight, scrollHeight: active.scrollHeight,
        image: { x: active.querySelector('img').offsetLeft, y: active.querySelector('img').offsetTop,
          width: active.querySelector('img').offsetWidth, height: active.querySelector('img').offsetHeight,
          fit: getComputedStyle(active.querySelector('img')).objectFit, natural: active.querySelector('img').naturalWidth },
        tags: [...active.querySelectorAll('.audience-tags span')].map(node => ({ y: node.offsetTop, border: parseFloat(getComputedStyle(node).borderTopWidth) })),
        copySize: parseFloat(getComputedStyle(active.querySelector('p')).fontSize),
        cards: [...section.querySelectorAll('.audience-card')].map(node => ({ hidden: node.getAttribute('aria-hidden'), inert: node.inert })),
        pressed: [...section.querySelectorAll('.audience-option')].map(node => node.getAttribute('aria-pressed')),
      } : null };
  });
}

(async () => {
  await fs.mkdir(output, { recursive: true });
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
  try {
    for (const [width, height] of [[1366,768],[1920,1080],[3840,2160],[390,844],[430,932],[850,900],[851,900]]) {
      const mobile = width <= 850;
      const context = await browser.newContext({ viewport: { width, height }, isMobile: mobile, hasTouch: mobile });
      const entry = { viewport: `${width}x${height}`, errors: [], frames: [] };
      try {
        const page = await context.newPage();
        page.on('pageerror', error => entry.errors.push(error.message));
        await page.goto('http://127.0.0.1:4173/');
        await page.waitForFunction(() => window.__synthecoreScrollQA?.getState().ready);
        await page.evaluate(() => scrollTo(0, document.querySelector('#audiences').getBoundingClientRect().top + scrollY - 120));
        await pause(600);
        assert.equal(await page.locator('.audience-card.is-active').count(), 0, 'Cards start closed');
        let cardHeight;
        for (let i = 0; i < 3; i++) {
          const row = page.locator('.audience-option').nth(i);
          if (mobile) await row.tap(); else await row.hover();
          await pause(800);
          const state = await geometry(page); entry.frames.push(state);
          assert.equal(state.actionCount, 0, 'Inline action removed');
          assert.equal(state.heading.size, 32, 'Heading 32px');
          assert.ok(Math.abs(state.heading.lineHeight - 38.4) < .1, 'Heading line height 38.4px');
          assert.ok(state.heading.margin >= 32 && state.heading.margin <= 40, 'Compact heading gap');
          assert.ok(state.paddingBottom >= 80 && state.paddingBottom <= 112, 'Compact section bottom gap wins cascade');
          assert.equal(state.overflow, false, 'No horizontal scrolling');
          assert.equal(state.labelsFit, true, 'Category text fits its column');
          assert.ok(state.labelWeight < 380, 'Lighter category labels');
          assert.equal(state.active?.index, i, 'Correct category active');
          assert.equal(state.active.cards.filter(x => x.hidden === 'false' && !x.inert).length, 1, 'Only active card exposed');
          assert.equal(state.active.pressed.filter(x => x === 'true').length, 1, 'Only active button pressed');
          assert.ok(state.active.image.natural > 0 && state.active.image.y >= 0, 'Decoded image stays inside card top');
          assert.ok(state.active.image.y + state.active.image.height <= state.active.height + 1, 'Image stays inside card bottom');
          assert.equal(state.active.image.fit, 'contain');
          assert.ok(state.active.scrollHeight <= state.active.height + 1, 'All content fits card');
          assert.ok(state.active.tags.every(x => x.border === 0), 'Borderless tags');
          assert.ok(state.active.tags.every(x => Math.abs(x.y - state.active.tags[0].y) < 1), 'Tags in one row');
          assert.ok(state.active.copySize >= 15, 'Readable body copy');
          assert.ok(state.shellHeight < (width >= 2300 ? 640 : 570), 'Compact card height');
          if (!mobile) {
            assert.equal(state.display, 'grid');
            assert.equal(state.columns.split(' ').length, 2, 'Two desktop columns');
            assert.ok(state.shell.x >= state.list.right + 8, 'No card/list overlap');
            assert.ok(state.shell.right <= state.container.right + 1, 'Card stays within shared container');
            assert.ok(Math.abs(state.heading.x - state.container.x) < 1);
            assert.ok(Math.abs(state.list.x - state.container.x) < 1);
          }
          if (cardHeight !== undefined) assert.equal(state.shellHeight, cardHeight, 'Switching preserves card height');
          cardHeight = state.shellHeight;
        }
        if (mobile) {
          await page.locator('.audience-option').nth(2).tap();
          assert.equal(await page.locator('.audience-card.is-active').count(), 0, 'Second tap closes card');
          assert.equal(await page.locator('.audience-visual').evaluate(n => getComputedStyle(n).display), 'none', 'No empty mobile preview');
        } else {
          await page.mouse.move(2, 2); await pause(550);
          assert.equal(await page.locator('.audience-card.is-active').count(), 0, 'Pointer leave closes card');
          await page.locator('.audience-option').first().focus();
          await page.keyboard.press('Enter');
          assert.equal(await page.locator('.audience-card.is-active').count(), 1, 'Enter reveals');
          await page.keyboard.press('ArrowDown');
          assert.equal(await page.locator('.audience-option.is-active').getAttribute('data-audience'), '1', 'Arrow changes category');
          await page.keyboard.press(' ');
          assert.equal(await page.locator('.audience-option.is-active').getAttribute('data-audience'), '1', 'Space activates full row');
          await page.keyboard.press('Escape');
          assert.equal(await page.locator('.audience-card.is-active').count(), 0, 'Escape closes');
          await page.emulateMedia({ reducedMotion: 'reduce' });
          await page.locator('.audience-option').first().hover();
          assert.equal(await page.locator('.audience-card').first().evaluate(n => getComputedStyle(n).transitionDuration), '0s', 'Reduced motion preserved');
        }
        assert.deepEqual(entry.errors, []);
        entry.status = 'passed';
      } catch (error) { entry.status = 'failed'; entry.errors.push(error.message); results.errors.push(`${entry.viewport}: ${error.message}`); }
      finally { results.cases.push(entry); await context.close(); }
    }
    results.status = results.errors.length ? 'failed' : 'passed';
    if (results.errors.length) process.exitCode = 1;
  } finally {
    await browser.close();
    await fs.writeFile(path.join(output, 'acceptance.json'), JSON.stringify(results, null, 2));
    console.log(JSON.stringify({ status: results.status, cases: results.cases.map(({viewport,status,errors}) => ({viewport,status,errors})) }, null, 2));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
