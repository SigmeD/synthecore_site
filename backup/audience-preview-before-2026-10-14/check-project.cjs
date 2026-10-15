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
  const deckBaseline = 'backup/audience-deck-before-2026-10-14/';
  assert.equal(current, await read(deckBaseline + 'index.html'), 'Deck revision preserves all markup and copy');
  assert.equal(await read('js/hero-scroll.js'), await read(deckBaseline + 'hero-scroll.js'), 'Hero scroll controller preserved');
  const [css, originalCSS] = await Promise.all([read('css/main.css'), read(deckBaseline + 'main.css')]);
  assert.equal(css.split('/* Audiences:')[0], originalCSS.split('/* Audiences:')[0], 'CSS outside final audience block preserved');
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
