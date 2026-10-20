const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const { test } = require('node:test');

const root = path.resolve(__dirname, '..');
const validator = path.join(__dirname, 'verify-works-static.cjs');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const cards = [...html.matchAll(/    <article class="sc-work-item"[\s\S]*?    <\/article>/g)].map(match => match[0]);
const edit = (file, transform) => fixture => {
  const target = path.join(fixture, file);
  fs.writeFileSync(target, transform(fs.readFileSync(target, 'utf8')));
};
const markup = transform => edit('index.html', transform);
const mutations = [
  ['missing card', markup(s => s.replace(cards[0], '')), /six|order/i],
  ['reordered cards', markup(s => s.replace(cards[0], '@@FIRST@@').replace(cards[1], cards[0]).replace('@@FIRST@@', cards[1])), /order/i],
  ['duplicate DOM id', markup(s => s.replace('id="services-title"', 'id="hero-title"')), /duplicate.*id/i],
  ['missing label target', markup(s => s.replace('aria-labelledby="sc-work-b2b-title"', 'aria-labelledby="absent"')), /h2|label/i],
  ['label targets another card', markup(s => s.replace('aria-labelledby="sc-work-b2b-title"', 'aria-labelledby="sc-work-crm-title"')), /h2|label/i],
  ['label target is not h2', markup(s => s.replace('<h2 class="sc-work-content__title" id="sc-work-b2b-title">B2B-кабинет<br>для клиентов</h2>', '<div class="sc-work-content__title" id="sc-work-b2b-title">Title</div>')), /h2|label/i],
  ['empty title', markup(s => s.replace('B2B-кабинет<br>для клиентов', ' &#160; ')), /title|h2/i],
  ['empty category', markup(s => s.replace('>Веб-сервис</span>', '> &nbsp; </span>')), /category/i],
  ['missing description', markup(s => s.replace(/<p class="sc-work-content__description">[^<]*<\/p>/, '')), /description/i],
  ['empty description', markup(s => s.replace(/(<p class="sc-work-content__description">)[^<]*/, '$1 &#xA0; ')), /description/i],
  ['missing image', markup(s => s.replace(/<img src="\.\/assets\/works\/b2b[^>]*>/, '')), /image/i],
  ['empty image src', markup(s => s.replace('src="./assets/works/b2b-feature-wide.png"', 'src=""')), /image|src/i],
  ['wrong image mapping', markup(s => s.replace('./assets/works/b2b-feature-wide.png', './assets/works/crm-feature-wide.png')), /image|src/i],
  ['wrong natural dimension attribute', markup(s => s.replace('width="2560"', 'width="1"')), /dimension|width/i],
  ['missing image file', fixture => fs.unlinkSync(path.join(fixture, 'assets/works/b2b-feature-wide.png')), /ENOENT|image/i],
  ['wrong PNG dimensions', fixture => {
    const file = path.join(fixture, 'assets/works/b2b-feature-wide.png');
    const data = fs.readFileSync(file); data.writeUInt32BE(1, 16); fs.writeFileSync(file, data);
  }, /dimension|width|hash/i],
  ['wrong approved image hash', fixture => fs.appendFileSync(path.join(fixture, 'assets/works/b2b-feature-wide.png'), 'changed'), /hash|bytes/i],
  ['wrong section order', markup(s => s.replace('id="services"', 'id="@@TEMP@@"').replace('id="audiences"', 'id="services"').replace('id="@@TEMP@@"', 'id="audiences"')), /section.*order/i],
  ['nested rather than sequential section', markup(s => s.replace('<section class="sc-works"', '<section id="extra"><section class="sc-works"').replace('<!-- Neutral scroll', '</section><!-- Neutral scroll')), /section|direct/i],
  ['duplicate Works CSS hook', markup(s => s.replace('</head>', '<link rel="stylesheet" href="./css/works.css"></head>')), /duplicate|exactly one/i],
  ['duplicate Works JS hook', markup(s => s.replace('</body>', '<script defer src="./js/works.js"></script></body>')), /duplicate|exactly one/i],
  ['CSS hook before main', markup(s => s.replace('<link rel="stylesheet" href="./css/main.css">', '<link rel="stylesheet" href="./css/works.css">').replace(/(<link rel="stylesheet" href="\.\/assets\/vendor\/lenis[^>]+>\s*)<link rel="stylesheet" href="\.\/css\/works.css">/, '$1<link rel="stylesheet" href="./css/main.css">')), /CSS|stylesheet|order/i],
  ['Works script before dependencies', markup(s => s.replace('<script defer src="./assets/vendor/gsap-3.12.5.min.js">', '<script defer src="./js/works.js"></script><script defer src="./assets/vendor/gsap-3.12.5.min.js">').replace('<script defer src="./js/main.js"></script>\n<script defer src="./js/works.js"></script>', '<script defer src="./js/main.js"></script>')), /script|order/i],
  ['async Works script', markup(s => s.replace('defer src="./js/works.js"', 'async src="./js/works.js"')), /defer|async/i],
  ['duplicate vendor URL alias', markup(s => s.replace('</body>', '<script defer src="./assets/vendor/../vendor/lenis-1.3.26.min.js"></script></body>')), /duplicate/i],
  ['second external library copy', markup(s => s.replace('</body>', '<script defer src="https://cdn.example.com/lenis.min.js"></script></body>')), /library|external|duplicate/i],
  ['second Lenis constructor', edit('js/works.js', s => s + '\nnew window.Lenis({});'), /Lenis.*owner|constructor/i],
  ['missing Lenis constructor', edit('js/hero-scroll.js', s => s.replace('new window.Lenis(', 'createLenis(')), /Lenis.*owner|constructor/i],
  ['missing local CSS resource', fixture => fs.unlinkSync(path.join(fixture, 'css/works.css')), /ENOENT|resource/i],
  ['malformed nested markup', markup(s => s.replace('<picture><img src="./assets/works/b2b', '<picture><div><img src="./assets/works/b2b')), /closing|nest|unclosed/i],
  ['removed prototype category qualification', markup(s => s.replace('UX/UI-концепт · интерактивный прототип', 'UX/UI')), /approved.*category/i],
  ['removed prototype description qualification', markup(s => s.replace('Мобильный прототип сервиса', 'Мобильный сервис')), /approved.*description/i],
  ['removed demo-data qualification', markup(s => s.replace(' на демонстрационных данных', '')), /approved.*description/i],
  ['removed concept qualification', markup(s => s.replace(' Дизайн-концепт, не действующая платформа.', '')), /approved.*description/i],
  ['dangling services navigation link', markup(s => s.replace('href="#services"', 'href="#missing-services"')), /fragment.*target/i],
  ['dangling encoded navigation link', markup(s => s.replace('href="#services"', 'href="#%6dissing-services"')), /fragment.*target/i],
  ['malformed percent-encoded fragment', markup(s => s.replace('href="#services"', 'href="#%E0%A4%A"')), /malformed.*fragment/i],
  ['empty fragment', markup(s => s.replace('href="#services"', 'href="#"')), /fragment.*target/i],
];
for (const [index, id] of ['b2b', 'flowers', 'crm', 'beauty', 'prostor', 'metal'].entries()) {
  for (const [name, className] of [['title', 'sc-work-content__title'], ['category', 'sc-work-content__type'], ['description', 'sc-work-content__description']]) {
    mutations.push([`${id} nonempty ${name} copy changes`, markup(s => s.replace(cards[index], cards[index].replace(new RegExp(`(class="${className}"[^>]*>)`), '$1Changed '))), new RegExp(`approved.*${name}`, 'i')]);
  }
}
for (const id of ['b2b', 'flowers', 'crm', 'beauty', 'prostor', 'metal']) {
  mutations.push([`${id} image hash differs with same byte length`, fixture => {
    const file = path.join(fixture, `assets/works/${id}-feature-wide.png`);
    const data = fs.readFileSync(file); data[data.length - 1] ^= 1; fs.writeFileSync(file, data);
  }, /hash/i]);
}

test('current v60 static checks accept the site and reject isolated fixture mutations', async t => {
  assert.ok(fs.existsSync(validator), 'portable Works validator must exist');
  const { verifyWorks } = require(validator);
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'synthecore-checks-'));
  t.after(() => fs.rmSync(temp, { recursive: true, force: true }));
  const fixture = path.join(temp, 'site');
  fs.mkdirSync(fixture);
  for (const item of ['index.html', 'assets', 'css', 'js', 'docs/asset-manifest.json', 'docs/vendor-manifest.json', 'docs/font-manifest.json']) {
    fs.cpSync(path.join(root, item), path.join(fixture, item), { recursive: true });
  }
  await t.test('accepted package passes without HTTP or historical backups', async () => {
    const result = await verifyWorks(fixture);
    assert.equal(result.cards, 6);
    assert.equal(result.images, 6);
  });
  for (const [name, mutate, expected] of mutations) {
    await t.test(name, async () => {
      try {
        mutate(fixture);
        await assert.rejects(() => verifyWorks(fixture), expected);
      } finally {
        for (const item of ['index.html', 'js/works.js', 'js/hero-scroll.js', 'css/works.css', ...['b2b', 'flowers', 'crm', 'beauty', 'prostor', 'metal'].map(id => `assets/works/${id}-feature-wide.png`)]) {
          fs.copyFileSync(path.join(root, item), path.join(fixture, item));
        }
      }
    });
  }
  await t.test('whitespace, attribute quoting and nested inline text remain valid', async () => {
    markup(s => s.replace('class="sc-work-item"', "class = 'sc-work-item'").replace('>Веб-сервис</span>', '>\n  <strong>Веб-сервис</strong>  \n</span>').replace('B2B-кабинет<br>для клиентов', 'B2B-кабинет<br>\n  для   клиентов').replace('href="#services"', 'href="#%73ervices"'))(fixture);
    await verifyWorks(fixture);
  });
  await t.test('project check works offline from an unrelated cwd', async () => {
    const previous = process.cwd();
    try {
      process.chdir(temp);
      const result = await require('./check-project.cjs').verifyProject();
      assert.equal(result.cards, 6);
      assert.ok(result.hashes > 0);
      assert.equal(result.served, null);
    } finally { process.chdir(previous); }
  });
  for (const [name, file] of [['asset', 'assets/media/hero.webp'], ['vendor', 'assets/vendor/lenis-1.3.26.min.js']]) {
    await t.test(`${name} manifest hash rejects same-length mutation`, async () => {
      const target = path.join(fixture, file);
      const original = fs.readFileSync(target);
      const changed = Buffer.from(original); changed[changed.length - 1] ^= 1;
      fs.writeFileSync(target, changed);
      try {
        await assert.rejects(() => require('./check-project.cjs').verifyProject(fixture), /manifest hash/i);
      } finally { fs.writeFileSync(target, original); }
    });
  }
  await t.test('explicit HTTP verifies bytes and rejects stale content / 404', async () => {
    const { verifyHTTP, parseCLI } = require('./lib/static-resources.cjs');
    let mode = 'disk';
    const server = http.createServer((request, response) => {
      if (mode === '404') { response.writeHead(404); response.end(); }
      else response.end(mode === 'stale' ? 'old page' : fs.readFileSync(path.join(fixture, 'index.html')));
    });
    await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
    try {
      const url = `http://127.0.0.1:${server.address().port}/`;
      assert.equal(await verifyHTTP(fixture, ['index.html'], url), 1);
      mode = 'stale'; await assert.rejects(() => verifyHTTP(fixture, ['index.html'], url), /HTTP bytes/);
      mode = '404'; await assert.rejects(() => verifyHTTP(fixture, ['index.html'], url), /HTTP status/);
      assert.deepEqual(parseCLI([]), { http: null });
      assert.deepEqual(parseCLI(['--http']), { http: 'http://127.0.0.1:4173/' });
      assert.deepEqual(parseCLI(['--http', url]), { http: url });
      assert.deepEqual(parseCLI([url]), { http: url });
      assert.throws(() => parseCLI(['--unknown']), /Unknown argument/);
    } finally { await new Promise(resolve => server.close(resolve)); }
  });
});
