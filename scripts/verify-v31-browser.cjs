// Current v31 acceptance. Requires an installed Playwright browser and local HTTP server.
const fs = require('node:fs/promises');
const path = require('node:path');
const assert = require('node:assert/strict');
let playwright;
try { playwright = require('playwright'); }
catch { playwright = require(require.resolve('playwright-core', { paths: [process.cwd(), process.env.USERPROFILE || ''] })); }
const root = path.resolve(__dirname, '..');
const output = path.join(root, 'output/playwright/refactor-v31');
const phase = process.argv.find(arg => arg.startsWith('--capture='))?.split('=')[1] || 'after';
const baselinePhase = process.argv.find(arg => arg.startsWith('--baseline-phase='))?.split('=')[1] || 'before';
const engine = process.argv.find(arg => arg.startsWith('--engine='))?.split('=')[1] || 'chromium';
const only = process.argv.find(arg => arg.startsWith('--only='))?.split('=')[1];
const VIEWPORTS = [[1440, 900], [1920, 1080], [390, 844], [320, 700]];
assert.ok(!only || VIEWPORTS.some(([width, height]) => only === width + 'x' + height), 'Unsupported --only viewport');
const cascadeOnly = process.argv.includes('--cascade-only');
const videoOnly = process.argv.includes('--video-only');
const stressOnly = process.argv.includes('--stress-only');
const fallbacksOnly = process.argv.includes('--fallbacks-only');
const functionalOnly = process.argv.includes('--functional-only');
assert.ok(['before', 'after', 'audit'].includes(phase), 'Use --capture=before|after|audit');
assert.ok(['before', 'audit'].includes(baselinePhase), 'Use --baseline-phase=before|audit');
assert.ok(['chromium', 'firefox', 'webkit'].includes(engine), 'Unknown browser engine');
const url = process.env.SYNTHECORE_URL || 'http://127.0.0.1:4173/';
const ids = ['b2b', 'flowers', 'crm', 'beauty', 'prostor', 'metal'];
const report = { date: new Date().toISOString(), engine, phase, functionalOnly, url, cases: [], errors: [], status: 'running' };
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));

async function instrument(context) {
  await context.addInitScript(() => {
    window.__v31Lenis = { live: 0, max: 0, created: 0 };
    let ctor;
    Object.defineProperty(window, 'Lenis', { configurable: true, get: () => ctor, set: value => {
      ctor = new Proxy(value, { construct(target, args, newTarget) {
        const instance = Reflect.construct(target, args, newTarget), counts = window.__v31Lenis;
        counts.live++; counts.created++; counts.max = Math.max(counts.max, counts.live);
        const destroy = instance.destroy.bind(instance); let destroyed = false;
        instance.destroy = (...args) => { if (!destroyed) { counts.live--; destroyed = true; } return destroy(...args); };
        return instance;
      } });
    } });
  });
}

async function open(page, hash = '') {
  await page.goto(url + hash, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__synthecoreScrollQA?.getState().ready && window.__synthecoreWorksQA);
  await page.evaluate(() => document.fonts.ready);
  await pause(600);
}

async function scrollToY(page, target) {
  const limits = await page.evaluate(() => ({ y: scrollY, max: document.documentElement.scrollHeight - innerHeight }));
  const y = Math.round(Math.max(0, Math.min(limits.max, target)));
  await page.mouse.wheel(0, y - limits.y);
  await page.waitForFunction(y => Math.abs(scrollY - y) <= 1, y, { timeout: 8000 });
  await pause(1800);
}

async function measure(page) {
  return page.evaluate(() => {
    const works = document.getElementById('works');
    return { top: works.getBoundingClientRect().top + scrollY, step: document.querySelector('.sc-work-item').offsetHeight,
      audience: document.getElementById('audiences').getBoundingClientRect().top + scrollY,
      services: document.getElementById('services').getBoundingClientRect().top + scrollY };
  });
}

async function checkEngine(page, mobile) {
  const actual = await page.evaluate(() => ({ engine: window.__synthecoreScrollQA.getState().engine, ...window.__v31Lenis }));
  assert.equal(actual.engine, mobile ? 'native-mobile' : 'lenis-gsap-scrolltrigger', 'expected scroll engine');
  assert.equal(actual.live, mobile ? 0 : 1, 'expected live Lenis owner count');
  assert.ok(actual.max <= 1, 'no overlapping Lenis owners');
}

async function snapshot(page, directory, label, entry) {
  const screenshot = await page.screenshot({ path: path.join(directory, label + '.png') });
  const data = await page.evaluate(() => {
    const selectors = ['#floatingHeader', '.hero', '.hero-content', '.hero-head', '.hero h1', '.hero-stage', '.hero .photo', '.hero .photo img',
      '.hero-bottom', '#audiences', '.audience-container', '.audience-heading', '.audience-option', '.audience-card-shell', '.audience-card',
      '.sc-works', '.sc-work-item', '.sc-work-frame', '.sc-work-content', '.sc-work-content__title', '.sc-work-content__description', '#services', '#contact'];
    const props = ['display', 'position', 'overflow', 'overflow-x', 'overflow-y', 'width', 'height', 'min-height', 'max-height', 'margin', 'padding',
      'color', 'background-color', 'background-image', 'font-family', 'font-size', 'font-weight', 'line-height', 'letter-spacing', 'border-radius',
      'box-shadow', 'backdrop-filter', 'opacity', 'visibility', 'transform', 'clip-path', 'grid-template-columns', 'gap', 'object-fit', 'object-position', 'z-index'];
    const nodes = selectors.flatMap(selector => [...document.querySelectorAll(selector)].map((node, index) => {
      const style = getComputedStyle(node);
      return { selector, index, styles: Object.fromEntries(props.map(prop => [prop, style.getPropertyValue(prop)])) };
    }));
    const stage = document.querySelector('.hero-stage'), hero = document.querySelector('.hero');
    const typed = stage.computedStyleMap?.();
    const stageRect = stage.getBoundingClientRect(), heroRect = hero.getBoundingClientRect();
    const autoStageMargins = innerWidth <= 480 && typed?.get('margin-left')?.toString() === 'auto' && typed?.get('margin-right')?.toString() === 'auto';
    return { scroll: scrollY, nodes, autoStageMargins, stageCentered: Math.abs(stageRect.x + stageRect.width / 2 - heroRect.x - heroRect.width / 2) < .1,
      overflow: document.documentElement.scrollWidth > innerWidth + 1,
      lenis: window.__v31Lenis, hero: window.__synthecoreScrollQA.getState(), works: window.__synthecoreWorksQA.getState() };
  });
  assert.equal(data.overflow, false, label + ': no horizontal overflow');
  assert.ok(data.lenis.max <= 1, label + ': only one live Lenis');
  await fs.writeFile(path.join(directory, label + '.json'), JSON.stringify(data, null, 2));
  if (phase === 'after' && !functionalOnly) {
    const baseline = path.join(output, engine, baselinePhase, entry.viewport, label);
    const expected = await fs.readFile(baseline + '.png');
    assert.ok(screenshot.equals(expected), label + ': screenshot differs from accepted baseline');
    const old = JSON.parse(await fs.readFile(baseline + '.json', 'utf8'));
    assert.equal(data.scroll, old.scroll, label + ': same scroll position');
    const currentNodes = structuredClone(data.nodes), oldNodes = structuredClone(old.nodes);
    if (data.autoStageMargins) {
      // Blink sometimes serializes flex auto margins as 0 despite identical used geometry.
      // Reproduced with accepted CSS too. Typed OM preserves the actual computed `auto`.
      assert.ok(data.stageCentered, label + ': auto margins keep stage centered');
      for (const list of [currentNodes, oldNodes]) for (const node of list.filter(node => node.selector === '.hero-stage')) {
        const parts = node.styles.margin.split(' ');
        node.styles.margin = parts[0] + ' auto ' + (parts[2] || parts[0]) + ' auto';
      }
      const beforeMargin = old.nodes.find(node => node.selector === '.hero-stage').styles.margin;
      const afterMargin = data.nodes.find(node => node.selector === '.hero-stage').styles.margin;
      if (beforeMargin !== afterMargin) (entry.cssomAutoMarginNotes ||= []).push({ label, beforeMargin, afterMargin });
    }
    assert.deepEqual(currentNodes, oldNodes, label + ': computed styles unchanged');
    entry.compared++;
  }
  entry.frames++;
}

async function auditCascade(page, directory) {
  const rules = await page.evaluate(() => {
    function collect(list, parents, file) {
      return [...list].flatMap(rule => {
        const own = rule.selectorText ? [{ file, contexts: parents, selector: rule.selectorText, declarations: rule.style.cssText,
          matches: (() => { try { return document.querySelectorAll(rule.selectorText).length; } catch { return null; } })() }] : [];
        const nested = rule.cssRules?.length ? collect(rule.cssRules, [...parents, rule.conditionText || rule.name || rule.cssText.split('{')[0]], file) : [];
        return [...own, ...nested];
      });
    }
    return [...document.styleSheets].flatMap(sheet => collect(sheet.cssRules, [], new URL(sheet.href).pathname));
  });
  await fs.writeFile(path.join(directory, 'cascade.json'), JSON.stringify(rules, null, 2));
}

async function checkAudience(page, index) {
  const actual = await page.locator('.audience-option').evaluateAll(nodes => nodes.findIndex(node => node.getAttribute('aria-pressed') === 'true'));
  assert.equal(actual, index, 'audience selection');
  assert.equal(await page.locator('.audience-card:not([inert])').count(), index < 0 ? 0 : 1, 'only selected panel is accessible');
}

async function viewport(browser, width, height) {
  const key = width + 'x' + height, directory = path.join(output, engine, phase, key);
  await fs.mkdir(directory, { recursive: true });
  const mobile = width <= 480;
  const options = { viewport: { width, height }, hasTouch: mobile };
  if (engine !== 'firefox') options.isMobile = mobile;
  if (!cascadeOnly && phase === 'before' && width === 1440 && engine === 'chromium') options.recordVideo = { dir: directory, size: { width: 960, height: 600 } };
  const context = await browser.newContext(options);
  await instrument(context);
  const page = await context.newPage(), errors = [];
  const entry = { viewport: key, frames: 0, compared: 0, status: 'running', errors };
  const video = page.video();
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('requestfailed', request => errors.push(request.url() + ': ' + request.failure()?.errorText));
  page.on('response', response => { if (response.status() >= 400) errors.push(response.status() + ' ' + response.url()); });
  try {
    await open(page);
    await auditCascade(page, directory);
    if (cascadeOnly) { entry.status = 'passed'; return; }
    await checkEngine(page, mobile);
    const pin = await page.evaluate(() => window.__synthecoreScrollQA.getState().pinEnd);
    await snapshot(page, directory, 'hero-start', entry);
    if (!mobile) {
      for (const [name, progress] of [['hero-middle', .5], ['hero-end', 1]]) {
        await scrollToY(page, pin * progress);
        await snapshot(page, directory, name, entry);
      }
    }
    let geometry = await measure(page);
    await scrollToY(page, geometry.audience);
    await snapshot(page, directory, 'audiences-closed', entry);
    for (let i = 0; i < 3; i++) {
      const button = page.locator('.audience-option').nth(i);
      if (mobile) await button.tap();
      else {
        await button.hover(); await pause(350); await checkAudience(page, i);
        await button.focus();
      }
      await pause(600); await checkAudience(page, i);
      await snapshot(page, directory, 'audience-' + i, entry);
      await page.keyboard.press('Escape'); await pause(350); await checkAudience(page, -1);
    }
    // Independent keyboard navigation must select one panel without extra clicks.
    await page.locator('.audience-option').first().focus(); await checkAudience(page, 0);
    await page.keyboard.press('ArrowDown'); await checkAudience(page, 1);
    await page.keyboard.press('End'); await checkAudience(page, 2);
    await page.keyboard.press('Home'); await checkAudience(page, 0);
    await page.keyboard.press('Escape'); await checkAudience(page, -1);
    await page.mouse.move(1, 1);
    geometry = await measure(page);
    for (let i = 0; i < 6; i++) {
      await scrollToY(page, geometry.top + geometry.step * i);
      const article = page.locator('.sc-work-item').nth(i);
      assert.equal(await article.getAttribute('data-work-id'), ids[i]);
      await page.waitForFunction(i => { const img = document.querySelectorAll('.sc-work-item img')[i]; return img.complete && img.naturalWidth > 0; }, i);
      const fits = await article.evaluate(node => {
        const frame = node.querySelector('.sc-work-frame').getBoundingClientRect(), panel = node.querySelector('.sc-work-content').getBoundingClientRect();
        return panel.left >= frame.left - 1 && panel.right <= frame.right + 1 && panel.top >= 0 && panel.bottom <= innerHeight && panel.bottom <= frame.bottom + 1;
      });
      assert.ok(fits, ids[i] + ': full readable caption');
      await snapshot(page, directory, 'work-' + ids[i], entry);
    }
    await scrollToY(page, geometry.services);
    assert.ok(await page.locator('.sc-work-frame').last().evaluate(node => node.getBoundingClientRect().bottom <= 1), 'last work releases');
    await snapshot(page, directory, 'services-transition', entry);
    await page.keyboard.press('End'); await pause(1000);
    await snapshot(page, directory, 'contacts', entry);
    for (let i = 5; i >= 0; i--) await scrollToY(page, geometry.top + geometry.step * i);
    await scrollToY(page, pin * .5);
    await snapshot(page, directory, 'hero-reverse', entry);
    await page.mouse.wheel(0, 100000); await page.mouse.wheel(0, -100000); await pause(2400);
    await page.keyboard.press('Home'); await pause(900);
    if (await page.locator('#menuToggle').isVisible()) {
      await page.locator('#menuToggle').click(); assert.equal(await page.locator('#mobilePanel').isVisible(), true);
      await page.locator('#mobilePanel a[href="#works"]').click();
      assert.equal(await page.locator('#mobilePanel').isVisible(), false);
    } else await page.locator('.header-links a[href="#works"]').click();
    await pause(2600); assert.equal(await page.evaluate(() => location.hash), '#works');
    const anchor = await page.evaluate(() => document.getElementById('works').getBoundingClientRect().top - parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop));
    assert.ok(Math.abs(anchor) <= 2, 'works anchor respects existing scroll padding');
    await page.goBack(); await pause(1200); assert.equal(await page.evaluate(() => location.hash), '');
    await page.goForward(); await pause(1200); assert.equal(await page.evaluate(() => location.hash), '#works');
    await page.setViewportSize({ width: width + 20, height: height - 30 }); await pause(700);
    await page.setViewportSize({ width, height }); await pause(900);
    await page.emulateMedia({ reducedMotion: 'reduce' }); await pause(700);
    const reduced = await page.evaluate(() => ({ works: window.__synthecoreWorksQA.getState(), lenis: window.__v31Lenis,
      triggers: ScrollTrigger.getAll().filter(trigger => /^sc-work-/.test(trigger.vars.id)).length }));
    assert.equal(reduced.lenis.live, 0); assert.equal(reduced.triggers, 0);
    assert.ok(reduced.works.items.every(item => item.sticky === 'relative' && item.scale === 1));
    await page.locator('.audience-option').first().focus(); await checkAudience(page, 0);
    await page.keyboard.press('Escape'); await checkAudience(page, -1);
    await page.emulateMedia({ reducedMotion: 'no-preference' }); await pause(900);
    await checkEngine(page, mobile);
    assert.equal(await page.evaluate(() => ScrollTrigger.getAll().filter(trigger => /^sc-work-/.test(trigger.vars.id)).length), 6);
    assert.ok(await page.evaluate(() => window.__v31Lenis.max <= 1));
    assert.deepEqual(errors, []);
    entry.status = 'passed';
  } catch (error) { entry.status = 'failed'; entry.errors.push(error.stack); throw error; }
  finally {
    await context.close();
    if (video) { const target = path.join(directory, 'down-up.webm'); await video.saveAs(target); entry.video = path.relative(root, target); }
    report.cases.push(entry); console.log(engine + ' ' + key + ': ' + entry.status + ', ' + entry.frames + ' captures, ' + entry.compared + ' identical comparisons');
  }
}

async function fallbacks(browser) {
  for (const dependency of ['gsap-3.12.5.min.js', 'ScrollTrigger-3.12.5.min.js', 'lenis-1.3.26.min.js']) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage(), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    try {
      await page.route('**/' + dependency, route => route.fulfill({ contentType: 'text/javascript', body: '/* unavailable dependency */' }));
      await open(page);
      const expected = dependency.startsWith('lenis') ? 'single-frame-scale' : 'no-gsap';
      assert.equal(await page.evaluate(() => window.__synthecoreWorksQA.getState().mode), expected);
      assert.equal(await page.locator('.sc-work-item').count(), 6);
      await page.locator('.sc-work-frame').last().scrollIntoViewIfNeeded();
      assert.deepEqual(errors, []);
      report.cases.push({ fallback: dependency, status: 'passed' });
    } finally { await context.close(); }
  }
}

async function verifyVideo(browser) {
  const relative = 'output/playwright/refactor-v31/chromium/before/1440x900/down-up.webm';
  const stat = await fs.stat(path.join(root, relative));
  assert.ok(stat.size > 10000, 'Recording contains real video bytes');
  const page = await browser.newPage();
  try {
    await page.goto(url);
    const decoded = await page.evaluate(async source => {
      const video = document.createElement('video');
      video.muted = true; video.preload = 'auto'; video.src = source;
      video.style.cssText = 'position:fixed;inset:0;width:960px;height:600px;z-index:1000;background:black';
      document.body.append(video);
      await new Promise((resolve, reject) => {
        video.addEventListener('loadeddata', resolve, { once: true });
        video.addEventListener('error', () => reject(new Error('Recording decode error')), { once: true });
        setTimeout(() => reject(new Error('Recording decode timeout')), 15000);
      });
      const canvas = document.createElement('canvas'); canvas.width = 160; canvas.height = 100;
      const context = canvas.getContext('2d');
      const frames = [];
      await video.play();
      // Natural playback avoids stale paused-seek compositor frames in headless Chromium.
      for (const delay of [200, 2500, 2500]) {
        await new Promise(resolve => setTimeout(resolve, delay));
        await new Promise(resolve => video.requestVideoFrameCallback ? video.requestVideoFrameCallback(resolve) : setTimeout(resolve, 250));
        context.drawImage(video, 0, 0, 160, 100);
        frames.push(canvas.toDataURL());
      }
      video.pause();
      return { duration: video.duration, width: video.videoWidth, height: video.videoHeight,
        decodedDistinctFrames: new Set(frames).size, error: video.error?.message || null, frames };
    }, new URL(relative, url).href);
    for (const [index, frame] of decoded.frames.entries()) await fs.writeFile(path.join(output, 'video-decoded-' + index + '.png'), Buffer.from(frame.split(',')[1], 'base64'));
    delete decoded.frames;
    console.log('Video metadata', JSON.stringify(decoded));
    assert.ok(decoded.duration > 5 && decoded.width > 0 && decoded.height > 0);
    assert.ok(decoded.decodedDistinctFrames > 1, 'Recording must show different real decoded frames');
    assert.equal(decoded.error, null);
    report.cases.push({ video: relative, bytes: stat.size, ...decoded, status: 'passed' });
    console.log(JSON.stringify(report.cases.at(-1)));
  } finally { await page.close(); }
}

async function stressInteractions(browser) {
  for (const [width, height] of VIEWPORTS) {
    if (only && only !== width + 'x' + height) continue;
    const mobile = width <= 480, options = { viewport: { width, height }, hasTouch: mobile };
    if (engine !== 'firefox') options.isMobile = mobile;
    const context = await browser.newContext(options); await instrument(context);
    const page = await context.newPage(), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    try {
      await open(page); await checkEngine(page, mobile);
      const geometry = await measure(page); await scrollToY(page, geometry.audience);
      const button = page.locator('.audience-option').first();
      if (mobile) {
        await button.tap(); await checkAudience(page, 0);
        await button.tap(); await checkAudience(page, -1);
      } else {
        assert.notEqual(await page.evaluate(() => document.activeElement.className), 'audience-option');
        await button.hover(); await pause(350); await checkAudience(page, 0);
        await page.mouse.move(1, 1); await pause(350); await checkAudience(page, -1);
      }
      await page.keyboard.press('Escape');
      for (let repeat = 0; repeat < 3; repeat++) {
        await page.emulateMedia({ reducedMotion: 'reduce' }); await pause(300);
        assert.equal(await page.evaluate(() => window.__v31Lenis.live), 0);
        assert.equal(await page.evaluate(() => ScrollTrigger.getAll().filter(trigger => /^sc-work-/.test(trigger.vars.id)).length), 0);
        await page.emulateMedia({ reducedMotion: 'no-preference' }); await pause(600);
        await checkEngine(page, mobile);
        assert.equal(await page.evaluate(() => ScrollTrigger.getAll().filter(trigger => /^sc-work-/.test(trigger.vars.id)).length), 6);
      }
      let touchDrag = false;
      if (mobile && engine === 'chromium') {
        const position = await measure(page); await scrollToY(page, position.top);
        const before = await page.evaluate(() => scrollY), cdp = await context.newCDPSession(page);
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: width / 2, y: height * .8 }] });
        for (let step = 1; step <= 8; step++) {
          await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: width / 2, y: height * (.8 - .5 * step / 8) }] });
          await pause(30);
        }
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await pause(700);
        assert.ok(await page.evaluate(() => scrollY) > before + 30, 'actual emulated touch drag advances native scroll');
        touchDrag = true;
      }
      assert.deepEqual(errors, []);
      report.cases.push({ viewport: width + 'x' + height, independentHoverOrTap: true, motionCycles: 3, touchDrag, status: 'passed' });
      console.log('Stress ' + width + 'x' + height + ': passed');
    } finally { await context.close(); }
  }
}

(async () => {
  await fs.mkdir(path.join(output, engine, phase), { recursive: true });
  let browser;
  try {
    browser = await playwright[engine].launch({ headless: true });
    report.browserVersion = browser.version();
    if (videoOnly) { await verifyVideo(browser); report.status = 'passed'; return; }
    if (stressOnly) { await stressInteractions(browser); report.status = 'passed'; return; }
    if (fallbacksOnly) { await fallbacks(browser); report.status = 'passed'; return; }
    for (const [width, height] of VIEWPORTS) {
      if (!only || only === width + 'x' + height) await viewport(browser, width, height);
    }
    if (!only && !cascadeOnly) await fallbacks(browser);
    assert.ok(report.cases.length, 'No viewport selected'); report.status = 'passed';
  } catch (error) { report.status = 'failed'; report.errors.push(error.stack); process.exitCode = 1; console.error(error); }
  finally {
    await browser?.close();
    await fs.writeFile(path.join(output, engine, phase, (functionalOnly ? 'functional-report' : fallbacksOnly ? 'fallback-report' : stressOnly ? 'stress-report' : videoOnly ? 'video-report' : cascadeOnly ? 'cascade-report' : 'report') + (only ? '-' + only : '') + '.json'), JSON.stringify(report, null, 2));
  }
})();
