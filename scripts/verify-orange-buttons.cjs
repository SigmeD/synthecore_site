'use strict';
// Real browser acceptance, using the project's existing local Playwright install.
const fs = require('node:fs');
const path = require('node:path');
const pw = require(require.resolve('playwright', {paths: [process.cwd(), process.env.USERPROFILE || '']}));
const baselineMode = process.argv.includes('--baseline');
const widths = (process.argv.find(arg => arg.startsWith('--only='))?.slice(7) || '320,390,768,1024,1440').split(',').map(Number);
const routes = (process.argv.find(arg => arg.startsWith('--routes='))?.slice(9) || 'home,works').split(',').map(route => route === 'home' ? '/' : '/raboty/');
const root = path.resolve(__dirname, '..');
const dir = path.join(root, 'output/playwright/orange-buttons');
const base = process.env.SYNTHECORE_URL || 'http://127.0.0.1:4176/';
const baselinePath = path.join(dir, 'baseline.json');
const reportPath = path.join(dir, 'report.json');
const baseline = !baselineMode && fs.existsSync(baselinePath) ? JSON.parse(fs.readFileSync(baselinePath)) : null;
const report = {date: new Date().toISOString(), base, baseline: baselineMode, baselineComparison: !!baseline, browser: 'Chromium', checks: [], samples: []};
const resumePath = baselineMode ? baselinePath : reportPath;
if ((widths.length < 5 || routes.length < 2) && fs.existsSync(resumePath)) {
  const previous = JSON.parse(fs.readFileSync(resumePath));
  const rerun = routes.flatMap(route => widths.map(width => (route === '/' ? 'home' : 'works') + '-' + width));
  report.checks = previous.checks.filter(c => /^(home|works)-/.test(c.name) && !rerun.some(label => c.name.startsWith(label)));
  report.samples = previous.samples.filter(s => !rerun.some(label => s.key.startsWith(label)));
}
if (!baselineMode && !baseline) console.log('No baseline.json: current behavior only; no before/after comparison.');
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
function check(name, pass, data) {
  report.checks.push({name, pass: !!pass, ...(data === undefined ? {} : {data})});
  if (!pass) console.log('FAIL ' + name + ' ' + JSON.stringify(data));
}
async function sample(page, key, selector, state) {
  // Wait for finite CSS transitions (including the arrow) before comparing.
  // Idle infinite scene animations stay running and are verified by raw SHA.
  await page.locator(selector).evaluate(async el => {
    await Promise.all(el.getAnimations({subtree: true})
      .filter(animation => Number.isFinite(animation.effect?.getTiming().iterations ?? 1))
      .map(animation => animation.finished.catch(() => {})));
  });
  const data = await page.locator(selector).evaluate(el => {
    const s = getComputedStyle(el);
    const properties = ['width', 'height', 'fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'letterSpacing',
      'padding', 'margin', 'borderWidth', 'borderRadius', 'position', 'display', 'gap', 'backgroundColor', 'color',
      'transform', 'transition', 'outlineStyle', 'outlineWidth', 'outlineColor', 'outlineOffset'];
    const decoration = node => {
      const css = getComputedStyle(node);
      return {boxShadow: css.boxShadow, filter: css.filter, textShadow: css.textShadow,
        before: getComputedStyle(node, '::before').boxShadow, after: getComputedStyle(node, '::after').boxShadow};
    };
    return {css: Object.fromEntries(properties.map(p => [p, s[p]])), decoration: decoration(el),
      descendants: [...el.querySelectorAll('svg,path,span')].map(decoration),
      arrow: el.querySelector('.arrow') ? getComputedStyle(el.querySelector('.arrow')).transform : null,
      focusVisible: el.matches(':focus-visible'), href: el.getAttribute('href')};
  });
  report.samples.push({key, state, ...data});
  if (state === 'hover' || state === 'active') {
    check(key + '/' + state + ' pseudo-state reached', await page.locator(selector).evaluate((n, s) => n.matches(':' + s), state));
  }
  const isOrange = data.css.backgroundColor === 'rgb(228, 77, 31)' || data.css.backgroundColor === 'rgb(252, 112, 69)';
  if (isOrange) {
    check(key + '/' + state + ' no glow', [data.decoration, ...data.descendants].every(d =>
      d.boxShadow === 'none' && !d.filter.includes('drop-shadow') && d.textShadow === 'none' && d.before === 'none' && d.after === 'none'), data.decoration);
  }
  if (state === 'focus') check(key + ' keyboard outline', data.focusVisible && !['none', 'hidden'].includes(data.css.outlineStyle) && parseFloat(data.css.outlineWidth) >= 2, data.css);
  if (baseline) {
    const old = baseline.samples.find(s => s.key === key && s.state === state);
    check(key + '/' + state + ' baseline exists', !!old);
    if (old) {
      // Protected scroll/idle animations may be at a different phase. Their
      // source bytes are verified separately; compare stable surface CSS here.
      const animatedTransform = state.startsWith('surface') || (key.endsWith('/step-1') && state === 'normal');
      const properties = Object.keys(data.css).filter(p => !animatedTransform || p !== 'transform');
      check(key + '/' + state + ' geometry/type/color/arrow/function preserved',
        properties.every(p => data.css[p] === old.css[p]) && data.arrow === old.arrow && data.href === old.href,
        {...Object.fromEntries(properties.filter(p => data.css[p] !== old.css[p]).map(p => [p, {before: old.css[p], after: data.css[p]}])),
          ...(data.arrow !== old.arrow ? {arrow: {before: old.arrow, after: data.arrow}} : {}),
          ...(data.href !== old.href ? {href: {before: old.href, after: data.href}} : {})});
      if (!isOrange) check(key + '/' + state + ' other shadows preserved', JSON.stringify(data.decoration) === JSON.stringify(old.decoration));
    }
  }
}
async function states(page, key, selector) {
  const el = page.locator(selector);
  await el.scrollIntoViewIfNeeded();
  await page.mouse.move(0, 0);
  await el.evaluate(n => n.blur());
  await pause(450);
  await sample(page, key, selector, 'normal');
  await el.hover({timeout: 5000});
  await pause(450);
  await sample(page, key, selector, 'hover');
  await page.mouse.down();
  await pause(450);
  await sample(page, key, selector, 'active');
  // Release off target to avoid following mailto links or toggling process steps.
  await page.mouse.move(0, 0);
  await page.mouse.up();
  await el.focus();
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Tab');
  check(key + ' Tab reaches target', await el.evaluate(n => document.activeElement === n));
  await pause(450);
  await sample(page, key, selector, 'focus');
  await el.evaluate(n => n.blur());
}
async function overflow(page, key) {
  const size = await page.evaluate(() => ({width: innerWidth, document: document.documentElement.scrollWidth, body: document.body.scrollWidth}));
  check(key + ' no horizontal overflow', size.document <= size.width + 1 && size.body <= size.width + 1, size);
}
async function preserved(page, key, selectors) {
  for (const selector of selectors) {
    if (!await page.locator(selector).count()) continue;
    if (!await page.locator(selector).first().isVisible()) continue;
    await page.locator(selector).first().scrollIntoViewIfNeeded();
    await pause(1000);
    await sample(page, key + selector, selector + ' >> nth=0', 'surface');
    // Work frames overlap intentionally inside the protected scroll scene.
    // Their shadows are sampled without trying to hover an occluded frame.
    const pointer = await page.locator(selector).first().evaluate(n => {
      const r = n.getBoundingClientRect(), x = r.x + r.width / 2, y = r.y + r.height / 2;
      return x > 0 && x < innerWidth && y > 0 && y < innerHeight && n.contains(document.elementFromPoint(x, y)) ? {x, y} : null;
    });
    if (selector === '.sc-work-frame' || !pointer) continue;
    await page.mouse.move(pointer.x, pointer.y);
    await pause(1000);
    await sample(page, key + selector, selector + ' >> nth=0', 'surface-hover');
    await page.mouse.move(0, 0);
  }
}
(async () => {
  fs.mkdirSync(dir, {recursive: true});
  const browser = await pw.chromium.launch({headless: true});
  report.browserVersion = browser.version();
  try {
    for (const width of widths) {
      for (const route of routes) {
        const label = (route === '/' ? 'home' : 'works') + '-' + width;
        const context = await browser.newContext({viewport: {width, height: 900}});
        const page = await context.newPage();
        const errors = [], failedRequests = [];
        page.on('pageerror', e => errors.push(e.message));
        page.on('response', r => {if (r.status() >= 400) failedRequests.push({url: r.url(), status: r.status()});});
        const response = await page.goto(new URL(route, base).href, {waitUntil: 'load'});
        await page.evaluate(() => document.fonts.ready);
        await pause(1200);
        check(label + ' loads', response.status() === 200);
        await overflow(page, label + '/top');
        if (width > 850) await states(page, label + '/header', '#floatingHeader > .nav-cta');
        if (width <= 850) {
          await page.locator('#menuToggle').click();
          check(label + ' mobile menu opens', await page.locator('#mobilePanel').isVisible());
          await states(page, label + '/menu', '#mobilePanel a:last-child');
          await overflow(page, label + '/menu');
          if ([390, 1440].includes(width)) await page.screenshot({path: path.join(dir, label + (baselineMode ? '-before' : '-after') + '-menu.png')});
          await page.keyboard.press('Escape');
          check(label + ' menu ESC closes', await page.locator('#mobilePanel').isHidden());
        }
        await states(page, label + '/intro', route === '/' ? '.main-cta' : '.catalog-intro__cta');
        await page.mouse.move(0, 0);
        await page.evaluate(() => {document.activeElement?.blur(); scrollTo({top: 0, behavior: 'instant'});});
        await pause(500);
        if ([390, 1440].includes(width)) await page.screenshot({path: path.join(dir, label + (baselineMode ? '-before' : '-after') + '-top.png')});
        if (route === '/') {
          for (let i = 1; i <= 3; i++) await states(page, label + '/step-' + i, '.sc-process__step:nth-child(' + i + ') .sc-process__marker');
          await page.locator('.sc-process__marker').first().click();
          check(label + ' process click works', await page.locator('.sc-process__marker').first().getAttribute('aria-pressed') === 'true');
          await preserved(page, label, ['.sc-services__arrow:not(:disabled)', '.sc-service-card', '.sc-work-frame']);
          const faq = page.locator('.sc-faq__question').first();
          await faq.click();
          check(label + ' FAQ works', await faq.getAttribute('aria-expanded') === 'true');
          await faq.click();
        } else {
          await preserved(page, label, ['.case-card']);
          for (const id of ['b2b', 'flowers', 'crm', 'beauty', 'prostor', 'metal']) {
            const project=page.locator('[data-project="'+id+'"]');
            if(await project.evaluate(e=>e.tagName==='A')){
              await project.click();await page.waitForURL('**/raboty/beauty-insight/');
              check(label+'/'+id+' primary link navigates',await page.locator('#caseTitle').isVisible());
              await page.goBack();await page.waitForSelector('#catalog-title');continue;
            }
            await page.locator('[data-project="' + id + '"]').click();
            check(label + '/' + id + ' detail opens', await page.locator('#caseDialog').evaluate(n => n.open));
            await states(page, label + '/detail-' + id, '.case-dialog__cta');
            await overflow(page, label + '/detail-' + id);
            const dialogOverflow = await page.locator('#caseDialog').evaluate(n => n.scrollWidth - n.clientWidth);
            check(label + '/' + id + ' no dialog overflow', dialogOverflow <= 1, dialogOverflow);
            await sample(page, label + '/dialog-' + id, '#caseDialog', 'surface');
            if (id === 'b2b' && [390, 1440].includes(width)) await page.screenshot({path: path.join(dir, label + (baselineMode ? '-before' : '-after') + '-detail.png')});
            await page.keyboard.press('Escape');
            check(label + '/' + id + ' detail closes/restores focus', await page.locator('[data-project="' + id + '"]').evaluate(n => document.activeElement === n && !document.querySelector('#caseDialog').open));
          }
        }
        await page.locator('#contact').scrollIntoViewIfNeeded();
        await pause(1300);
        await states(page, label + '/footer', '.sc-footer__cta');
        await overflow(page, label + '/footer');
        if ([390, 1440].includes(width)) await page.screenshot({path: path.join(dir, label + (baselineMode ? '-before' : '-after') + '-footer.png')});
        check(label + ' no JS/network errors', errors.length === 0 && failedRequests.length === 0, {errors, failedRequests});
        await context.close();
        console.log('DONE ' + label);
      }
    }
  } catch (e) {
    check('browser scenario completed', false, e.stack);
  } finally {
    await browser.close();
    report.passed = report.checks.filter(c => c.pass).length;
    report.failed = report.checks.length - report.passed;
    fs.writeFileSync(baselineMode ? baselinePath : reportPath, JSON.stringify(report, null, 2) + '\n');
    console.log(JSON.stringify({baseline: baselineMode, passed: report.passed, failed: report.failed, samples: report.samples.length}));
    if (report.failed) process.exitCode = 1;
  }
})();
