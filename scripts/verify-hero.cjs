// Real-browser acceptance. Requires Playwright and Chromium; no mocked results.
const fs = require('node:fs/promises');
const path = require('node:path');
const assert = require('node:assert/strict');
let playwright;
try { playwright = require('playwright'); }
catch {
  playwright = require(require.resolve('playwright-core', { paths: [process.cwd(), process.env.USERPROFILE || ''] }));
}
const root = path.resolve(__dirname, '..');
const output = path.join(root, 'output/playwright');
const url = process.env.SYNTHECORE_URL || 'http://127.0.0.1:4173/';
const results = { date: new Date().toISOString(), url, browser: 'Chromium', cases: [], errors: [] };
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));

async function snapshot(page) {
  return page.evaluate(() => {
    const rect = node => { const r = node.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height, bottom: r.bottom }; };
    const hero = document.querySelector('.hero'), photo = hero.querySelector('.photo:not(.photo-position-holder)');
    const img = photo.querySelector('img'), matrix = new DOMMatrix(getComputedStyle(img).transform);
    const cta = hero.querySelector('.main-cta'), ctaRect = cta.getBoundingClientRect();
    return {
      qa: window.__synthecoreScrollQA?.getState?.(), hero: rect(hero), photo: rect(photo),
      image: rect(img), naturalWidth: img.naturalWidth, display: getComputedStyle(photo).display,
      clip: getComputedStyle(photo).clipPath, scaleX: matrix.a, scaleY: matrix.d,
      documentHeight: document.documentElement.scrollHeight,
      overflow: document.documentElement.scrollWidth > innerWidth + 1,
      audienceTitle: rect(document.getElementById('audience-title')),
      ctaOnTop: ctaRect.y < 0 || ctaRect.bottom > innerHeight ||
        cta.contains(document.elementFromPoint(ctaRect.x + ctaRect.width / 2, ctaRect.y + ctaRect.height / 2)),
      selectedCards: document.querySelectorAll('.audience-card.is-active').length,
      titleTop: hero.querySelector('h1').getBoundingClientRect().top,
      headerBottom: document.getElementById('floatingHeader').getBoundingClientRect().bottom,
    };
  });
}

function checkFrame(frame, active) {
  assert.ok(frame.naturalWidth > 0, 'Photo must decode');
  assert.notEqual(frame.display, 'none', 'Photo must remain displayed');
  assert.equal(frame.overflow, false, 'No horizontal overflow');
  assert.equal(frame.ctaOnTop, true, 'CTA must remain on top of media');
  if (active) {
    assert.equal(frame.qa.engine, 'lenis-gsap-scrolltrigger');
    assert.ok(Math.abs(frame.scaleX - frame.scaleY) < .0001, 'Image scale must be uniform');
    assert.ok(frame.clip.startsWith('inset('), 'Hero media must have an inset mask');
  }
}

async function open(page) {
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__synthecoreScrollQA?.getState?.().ready);
  await page.evaluate(() => document.fonts.ready);
  await pause(500); // Allow the emulated viewport's first compositor frame to settle.
}

async function wheelTo(page, target) {
  const current = await page.evaluate(() => window.__synthecoreScrollQA.getState().targetScroll);
  await page.mouse.wheel(0, target - current);
  // Test waits do not drive the application animation.
  await pause(1850);
  const state = await page.evaluate(() => window.__synthecoreScrollQA.getState());
  if (state.gateState === 'READY' && target > state.pinEnd) {
    await page.mouse.wheel(0, target - state.pinEnd);
    await pause(1850);
  }
}

async function desktop(browser, width, height) {
  const label = `${width}x${height}`;
  const context = await browser.newContext({ viewport: { width, height } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('requestfailed', request => errors.push(`${request.url()}: ${request.failure()?.errorText}`));
  try {
    await open(page);
    await page.mouse.move(2, 2);
    const start = await snapshot(page);
    checkFrame(start, true);
    assert.ok(start.titleTop >= start.headerBottom + 12, 'Hero title must start below the floating header');
    assert.equal(start.qa.duration, 1.2);
    assert.equal(start.qa.lerp, 0);
    const distance = start.qa.pinEnd - start.qa.pinStart;
    const frames = [];
    for (const progress of [0, .25, .5, .75, 1]) {
      await wheelTo(page, start.qa.pinStart + distance * progress);
      const frame = await snapshot(page);
      checkFrame(frame, true);
      assert.ok(Math.abs(frame.qa.timelineProgress - progress) < .02, 'Scrub must settle at scroll progress');
      assert.ok(Math.abs(frame.documentHeight - start.documentHeight) <= 2, 'Document height must stay stable');
      assert.equal(frame.selectedCards, 0, 'Stationary pointer must not open cards');
      frames.push(frame);
      await page.screenshot({ path: path.join(output, `${label}-${progress * 100}.png`) });
    }
    await wheelTo(page, start.qa.pinStart + distance * .3);
    await page.mouse.wheel(0, distance * .2);
    const samples = [];
    for (let i = 0; i < 20; i++) { samples.push(await snapshot(page)); await pause(100); }
    for (let i = 1; i < samples.length; i++) {
      assert.ok(samples[i].qa.scroll >= samples[i - 1].qa.scroll - 1, 'No spring or wheel-stop reversal');
      assert.ok(samples[i].qa.timelineProgress >= samples[i - 1].qa.timelineProgress - .001, 'No media reversal after wheel stop');
    }
    assert.ok(samples.every(frame => Math.abs(frame.qa.scrollProgress - frame.qa.timelineProgress) < .002), 'Reveal must follow the same smoothed scroll as pin release');
    assert.ok(Math.abs(samples.at(-1).qa.timelineProgress - samples.at(-1).qa.scrollProgress) < .005, 'Lag must settle');
    await page.mouse.wheel(0, 100);
    await pause(120);
    await page.keyboard.press('PageDown');
    await pause(600);
    const keyboardState = await snapshot(page);
    assert.ok(keyboardState.qa.scroll > samples.at(-1).qa.scroll + 100, 'Keyboard must interrupt inertia and scroll normally');
    for (const progress of [.75, .5, .25, 0]) {
      await wheelTo(page, start.qa.pinStart + distance * progress);
      checkFrame(await snapshot(page), true);
    }
    await wheelTo(page, start.qa.pinEnd + 240);
    const release = await snapshot(page);
    assert.equal(release.qa.pinActive, false);
    assert.ok(release.audienceTitle.y < height, 'Real next heading must enter the viewport');
    assert.ok(release.audienceTitle.y - release.hero.bottom <= 145, 'No extra gap after Hero');
    await page.screenshot({ path: path.join(output, `${label}-release.png`) });
    await page.locator('.audience-option').first().focus();
    assert.equal(await page.locator('.audience-card.is-active').count(), 1);
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('.audience-card.is-active').count(), 0);
    await page.locator('.header-links a[href="#services"]').click();
    await pause(1850);
    const servicesTop = await page.locator('#services').evaluate(node => node.getBoundingClientRect().top);
    assert.ok(servicesTop >= 80 && servicesTop <= 180, 'Anchor should honor fixed header offset');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.waitForFunction(() => window.__synthecoreScrollQA.getEngine() === 'native-reduced-motion');
    assert.equal(await page.locator('.hero-stage > .photo:not(.photo-position-holder)').count(), 1);
    assert.equal(await page.locator('.pin-spacer').count(), 0);
    await page.evaluate(() => window.scrollTo(0, 0));
    await pause(100);
    const reducedStart = await snapshot(page);
    assert.ok(reducedStart.titleTop >= reducedStart.headerBottom + 12, 'Reduced-motion title must remain below header');
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.waitForFunction(() => window.__synthecoreScrollQA.getEngine() === 'lenis-gsap-scrolltrigger');
    assert.equal(await page.locator('.pin-spacer').count(), 1);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForFunction(() => window.__synthecoreScrollQA.getEngine() === 'native-mobile');
    assert.equal(await page.locator('.pin-spacer').count(), 0);
    await page.setViewportSize({ width, height });
    await page.waitForFunction(() => window.__synthecoreScrollQA.getEngine() === 'lenis-gsap-scrolltrigger');
    await pause(400);
    assert.equal(await page.locator('.pin-spacer').count(), 1);
    assert.deepEqual(errors, [], 'No runtime or network errors');
    results.cases.push({ label, status: 'passed', frames, release, wheelStopSamples: samples });
  } catch (error) {
    const lastFrame = await snapshot(page).catch(() => null);
    await page.screenshot({ path: path.join(output, `${label}-failure.png`) }).catch(() => {});
    results.cases.push({ label, status: 'failed', error: error.message, errors, lastFrame }); throw error;
  }
  finally { await context.close(); }
}

async function mobile(browser, width, height) {
  const context = await browser.newContext({ viewport: { width, height }, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  try {
    await open(page);
    const frame = await snapshot(page);
    checkFrame(frame, false);
    assert.ok(frame.titleTop >= frame.headerBottom + 12, 'Mobile title must start below header');
    assert.equal(frame.qa.engine, 'native-mobile');
    assert.equal(frame.qa.smoothWheel, false);
    assert.equal(await page.locator('.pin-spacer').count(), 0);
    await page.screenshot({ path: path.join(output, `${width}x${height}-native.png`) });
    await page.locator('#menuToggle').tap();
    assert.equal(await page.locator('#menuToggle').getAttribute('aria-expanded'), 'true');
    await page.locator('#mobilePanel a[href="#services"]').tap();
    assert.equal(await page.locator('#menuToggle').getAttribute('aria-expanded'), 'false');
    await page.locator('.audience-option').first().tap();
    assert.equal(await page.locator('.audience-card.is-active').count(), 1);
    await page.locator('.audience-option').first().tap();
    assert.equal(await page.locator('.audience-card.is-active').count(), 0);
    assert.deepEqual(errors, []);
    results.cases.push({ label: `${width}x${height}`, status: 'passed', frame });
  } finally { await context.close(); }
}

async function missingDependencies(browser) {
  for (const file of ['lenis-1.3.26.min.js', 'gsap-3.12.5.min.js']) {
    const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
    // Simulate a successfully loaded empty dependency, avoiding expected 404 noise.
    await context.route(`**/${file}`, route => route.fulfill({ contentType: 'application/javascript', body: '' }));
    const page = await context.newPage();
    await open(page);
    const frame = await snapshot(page);
    checkFrame(frame, false);
    assert.equal(frame.qa.smoothWheel, false);
    assert.equal(frame.qa.engine, file.startsWith('lenis') ? 'gsap-scrolltrigger' : 'native-missing-dependencies');
    await context.close();
    results.cases.push({ label: `missing ${file}`, status: 'passed' });
  }
}

async function record(browser) {
  results.recording = await require('./record-hero.cjs').record(browser, output);
}

async function reference(browser) {
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = await context.newPage();
  try {
    await page.goto('https://www.roveia.com/', { waitUntil: 'domcontentloaded' });
    await pause(3000);
    const data = { viewport: '1920x1080', scripts: await page.locator('script[src]').evaluateAll(nodes => nodes.map(node => node.src)), frames: [] };
    for (let i = 0; i < 6; i++) {
      data.frames.push(await page.evaluate(() => ({
        scrollY, spacers: [...document.querySelectorAll('.pin-spacer')].map(node => ({ width: node.offsetWidth, height: node.offsetHeight })),
        triggers: window.ScrollTrigger?.getAll?.().map(trigger => ({ start: trigger.start, end: trigger.end, progress: trigger.progress, scrub: trigger.vars.scrub })) ?? [],
      })));
      await page.screenshot({ path: path.join(output, `roveia-${i}.png`) });
      await page.mouse.wheel(0, 250);
      await pause(1600);
    }
    await fs.writeFile(path.join(output, 'reference.json'), JSON.stringify(data, null, 2) + '\n');
    results.referenceCapture = 'captured; visual comparison still requires reading the frames';
  } finally { await context.close(); }
}

(async () => {
  await fs.mkdir(output, { recursive: true });
  let browser;
  try {
    browser = process.env.PLAYWRIGHT_CDP_URL
      ? await playwright.chromium.connectOverCDP(process.env.PLAYWRIGHT_CDP_URL)
      : await playwright.chromium.launch({ headless: !process.argv.includes('--headed') });
    const only = process.argv.find(arg => arg.startsWith('--only='))?.slice(7);
    for (const [width, height] of [[1366, 768], [1920, 1080], [3840, 2160]]) {
      if (!only || only === `${width}x${height}`) await desktop(browser, width, height);
    }
    for (const [width, height] of [[390, 844], [430, 932]]) {
      if (!only || only === `${width}x${height}`) await mobile(browser, width, height);
    }
    if (only) { assert.ok(results.cases.length, 'Unknown viewport filter'); results.scope = only; results.status = 'passed'; return; }
    await missingDependencies(browser);
    if (process.argv.includes('--record')) await record(browser);
    if (process.argv.includes('--reference')) await reference(browser);
    results.status = 'passed';
  } catch (error) {
    results.status = results.cases.length ? 'failed' : 'blocked';
    results.errors.push(error.message);
    process.exitCode = 1;
  } finally {
    await browser?.close();
    await fs.writeFile(path.join(output, 'acceptance.json'), JSON.stringify(results, null, 2) + '\n');
    console.log(JSON.stringify({ status: results.status, cases: results.cases.map(({ label, status }) => ({ label, status })), errors: results.errors }));
  }
})();
