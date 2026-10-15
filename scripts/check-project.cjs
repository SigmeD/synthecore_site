const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFile(path.join(root, file), 'utf8');
const normalize = html => html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, '')
  .replace(/<link[^>]*lenis-1\.3\.26\.css[^>]*>/g, '').replace(/\s+/g, ' ').trim();
(async () => {
  const [current, baseline, main, originalMain] = await Promise.all([
    read('index.html'), read('backup/v23.1-before-lenis/index.html'),
    read('js/main.js'), read('backup/v23.1-before-lenis/js/main.js'),
  ]);
  // User-approved audience revision removes only these three inline actions.
  const approvedBaseline = baseline.replace(/<span class="audience-option-action">Смотреть\s*↗<\/span>/g, '');
  assert.equal(normalize(current), normalize(approvedBaseline), 'HTML/content preserved except approved audience actions');
  const audienceBoundary = "    (()=>{\n      const section=document.getElementById('audiences');";
  assert.ok(main.includes(audienceBoundary) && originalMain.includes(audienceBoundary));
  assert.equal(main.slice(0, main.indexOf(audienceBoundary)), originalMain.slice(0, originalMain.indexOf(audienceBoundary)), 'Header handlers remain unchanged');
  const previewBaseline = 'backup/audience-preview-before-2026-10-14/';
  assert.equal(current, await read(previewBaseline + 'index.html'), 'Preview revision preserves all markup and copy');
  const phaseBaseline = 'backup/hero-two-phases-before-2026-10-14/';
  const [hero, originalHero] = await Promise.all([read('js/hero-scroll.js'), read(phaseBaseline + 'hero-scroll.js')]);
  const block = (source, name) => {
    const start = source.indexOf('  function ' + name + '(');
    assert.ok(start >= 0);
    return source.slice(start, source.indexOf('\n  }', start) + 4);
  };
  for (const name of ['focusAnchor']) {
    assert.equal(block(hero, name), block(originalHero, name), `${name}: geometry, colors and navigation preserved`);
  }
  const reveal = source => source.match(/        timeline\s*\n[\s\S]*?\.fromTo\(toneState[^\n]+/)[0]
    .replace(/\n\s*\.fromTo\(hero, \{ height:[^\n]+/, '');
  const originalTiming = source => source.replaceAll('duration: settings.revealPortion','duration: 1');
  assert.equal(originalTiming(reveal(hero)), reveal(originalHero), 'Reveal bounds/scale/shade preserved; only measured media duration changed');
  assert.equal(await read('js/hero-geometry.js'), await read(phaseBaseline + 'hero-geometry.js'), 'Crop calculations unchanged');
  assert.equal(main, await read(phaseBaseline + 'main.js'), 'Audience hover behavior remains unchanged');
  assert.equal(current, await read(phaseBaseline + 'index.html'), 'No wrappers, duplicated headings or markup changes');
  const gateCSS = await read('css/main.css');
  const reference = await read('output/playwright/audience-parallax/reference/hero-scroll.js');
  for (const name of ['measure', 'renderTones']) {
    const restored = block(hero, name).replace('Math.min(1, toneState.progress / settings.revealPortion)', 'toneState.progress');
    assert.equal(restored, block(reference, name), `${name}: geometry/colors unchanged except actual mask progress normalization`);
  }
  assert.equal(originalTiming(reveal(hero)), reveal(reference), 'Reference endpoints, crop, uniform scale and shade retained');
  assert.ok(hero.includes('const settings = { duration: 1.2, scrub: true, pinViewportRatio: 1.1, revealPortion: 5 / 6 };'));
  assert.ok(!/function (filterWheel|settleBoundary|finishCheckpoint)\(|virtualScroll:|onScrubComplete:/.test(hero), 'No checkpoint consumes wheel events or delays pin release');
  const motionBaseline = 'backup/audience-parallax-before-2026-10-14/';
  const previousController = await read(motionBaseline + 'hero-scroll.js');
  for (const name of ['refresh', 'anchorClick', 'keyboardScroll']) {
    const approved = block(previousController, name).replace(/    bypassGate\('[^']+'\);\n/g, '');
    assert.equal(block(hero, name), approved, `${name}: navigation preserved except removed checkpoint bypass`);
  }
  const continuousBaseline = await read('backup/roveia-full-audit-before-2026-10-14/hero-scroll.js');
  const withoutAudienceMotion = source => source.replace(/        const audienceOffset[\s\S]*?(?=\n\n      }, hero\);)/, '')
    .replace(/        parallax = gsap.fromTo[\s\S]*?(?=\n\n      }, hero\);)/, '')
    .replace(', revealPortion: 5 / 6', '').replaceAll('duration: settings.revealPortion', 'duration: 1')
    .replace('Math.min(1, toneState.progress / settings.revealPortion)', 'toneState.progress')
    .replace('Preserve Works_v8 geometry; live Roveia media uses .5 of a .6 timeline.', 'Hero reveal settings and geometry follow the supplied Works_v8 HTML.');
  assert.equal(withoutAudienceMotion(hero), withoutAudienceMotion(continuousBaseline), 'Only documented reveal timing and audience entrance changed');
  const normalizedCSS = css => css.replace(/\s+/g, '');
  assert.equal(normalizedCSS(gateCSS), normalizedCSS(await read(phaseBaseline + 'main.css')), 'Reference Hero CSS restored; no other styles changed');
  const referenceCSS = await read('output/playwright/audience-parallax/reference/style-0.css');
  assert.equal(normalizedCSS(gateCSS.split('/* Audiences:')[0]), normalizedCSS(referenceCSS.split('/* Audiences:')[0]), 'CSS outside audience override matches supplied HTML');
  assert.equal(gateCSS.slice(gateCSS.indexOf('/* Audiences:')), (await read(motionBaseline + 'main.css')).split('/* Audiences:').slice(1).map(x=>'/* Audiences:'+x).join(''), 'Approved audience styles untouched');
  assert.equal(main, await read(motionBaseline + 'main.js'), 'Audience interactions unchanged');
  const [css, originalCSS] = await Promise.all([read('css/main.css'), read(previewBaseline + 'main.css')]);
  assert.equal(normalizedCSS(css.split('/* Audiences:')[0]), normalizedCSS(originalCSS.split('/* Audiences:')[0]), 'CSS outside audience block restored to reference');
  const audienceCSS = css.slice(css.indexOf('/* Audiences:'));
  assert.ok(!/(^|\n)\s*(?!#audiences|@|\/|\*|\}|[\w-]+\s*:)[.#][\w-]+/.test(audienceCSS), 'New selectors scoped to audiences');
  let verified = 0;
  for (const file of ['docs/asset-manifest.json', 'docs/vendor-manifest.json']) {
    for (const entry of JSON.parse(await read(file))) {
      const data = await fs.readFile(path.join(root, entry.path));
      assert.equal(data.length, entry.bytes);
      assert.equal(crypto.createHash('sha256').update(data).digest('hex'), entry.sha256);
      verified++;
    }
  }
  const resources = [...current.matchAll(/(?:src|href)="(\.\/[^"#]+)"/g)].map(match => match[1]);
  for (const resource of resources) {
    const response = await fetch(new URL(resource, 'http://127.0.0.1:4173/'));
    assert.equal(response.status, 200, resource);
    const served = Buffer.from(await response.arrayBuffer());
    const disk = await fs.readFile(path.join(root, resource));
    assert.ok(served.equals(disk), `${resource}: HTTP must serve the current file`);
  }
  console.log(`PASS: approved markup/interaction preservation, ${verified} hashes, ${resources.length} local HTTP resources match disk.`);
})().catch(error => { console.error(error); process.exitCode = 1; });
