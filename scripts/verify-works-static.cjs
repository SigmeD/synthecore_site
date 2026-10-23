const fs = require('node:fs/promises');
const path = require('node:path');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { parseHTML, hasClass, textContent, inside } = require('./lib/static-html.cjs');
const { localPath, sha256, verifyHTTP, parseCLI } = require('./lib/static-resources.cjs');
const approved = require('./lib/works-assets.cjs');
const originalCopy = require('./lib/works-copy.cjs');
const {catalogCopy}=require('./lib/project-copy.cjs');
const currentCopy=catalogCopy(path.resolve(__dirname,'..'));
const approvedCopy=Object.fromEntries(Object.entries(originalCopy).map(([id,copy])=>[id,{...copy,...currentCopy[id]}]));
const normalizedText = node => textContent(node).replace(/\s+/g, ' ').trim();
const ORDER = ['b2b', 'flowers', 'crm', 'beauty', 'prostor', 'metal'];
const SCRIPT_ORDER = [
  'assets/vendor/gsap-3.12.5.min.js', 'assets/vendor/ScrollTrigger-3.12.5.min.js',
  'assets/vendor/lenis-1.3.26.min.js', 'js/hero-geometry.js', 'js/hero-scroll.js', 'js/main.js', 'js/works.js', 'js/services.js', 'js/process.js', 'js/testimonials.js', 'js/faq-footer.js', 'js/footer-waves.js', 'js/footer-reveal.js',
];
async function verifyWorks(root = path.resolve(__dirname, '..')) {
  const { nodes } = parseHTML(await fs.readFile(path.join(root, 'index.html'), 'utf8'));
  const ids = new Map();
  for (const node of nodes.filter(node => Object.hasOwn(node.attrs, 'id'))) {
    assert.ok(node.attrs.id.trim() && !ids.has(node.attrs.id), `Duplicate or empty DOM id: ${node.attrs.id}`);
    ids.set(node.attrs.id, node);
  }
  const main = nodes.filter(node => node.tag === 'main');
  assert.equal(main.length, 1, 'Exactly one main required');
  const sections = nodes.filter(node => node.tag === 'section' && node.parent === main[0]);
  assert.deepEqual(sections.map(node => node.attrs.id), ['top', 'audiences', 'works', 'services', 'process', 'testimonials', 'faq', 'contact'], 'Section order: Hero, audiences, works, services, process, testimonials, FAQ, contact as direct main children');
  for (const anchor of nodes.filter(node => node.tag === 'a' && node.attrs.href?.startsWith('#'))) {
    let target;
    try { target = decodeURIComponent(anchor.attrs.href.slice(1)); }
    catch { throw new Error(`Malformed same-page fragment: ${anchor.attrs.href}`); }
    assert.ok(target && ids.has(target), `Same-page fragment target does not exist: ${anchor.attrs.href}`);
  }
  const testimonials=ids.get('testimonials');
  assert.ok(hasClass(testimonials,'sc-testimonials'), 'Testimonials must be standalone section');
  const demoCards=nodes.filter(node=>hasClass(node,'sc-testimonial'));
  assert.equal(demoCards.length,4,'Exactly four demo testimonial cards required');
  assert.equal(testimonials.attrs['data-demo'],'true','Demo review status must be explicit');
  for(const item of demoCards) assert.ok(inside(item,testimonials),'Testimonial card outside section');
  const works = ids.get('works');
  assert.ok(hasClass(works, 'sc-works'), '#works must use sc-works hook');
  const items = nodes.filter(node => hasClass(node, 'sc-work-item'));
  assert.equal(items.length, 6, 'Exactly six Works cards required');
  assert.deepEqual(items.map(node => node.attrs['data-work-id']), ORDER, 'Works card order must be b2b, flowers, crm, beauty, prostor, metal');
  for (const [index, card] of items.entries()) {
    const id = ORDER[index];
    assert.ok(card.tag === 'article' && inside(card, works), `${id}: Works card must be article inside #works`);
    const descendants = nodes.filter(node => inside(node, card));
    const heading = ids.get(card.attrs['aria-labelledby']);
    assert.ok(heading?.tag === 'h2' && inside(heading, card) && textContent(heading), `${id}: aria-labelledby must reference its own nonempty h2 title`);
    assert.equal(normalizedText(heading), approvedCopy[id].title, `${id}: approved title copy must be preserved`);
    for (const [name, className] of [['category', 'sc-work-content__type'], ['description', 'sc-work-content__description']]) {
      const matches = descendants.filter(node => hasClass(node, className));
      assert.ok(matches.length === 1 && textContent(matches[0]), `${id}: one nonempty ${name} required`);
      assert.equal(normalizedText(matches[0]), approvedCopy[id][name], `${id}: approved ${name} copy must be preserved`);
    }
    const images = descendants.filter(node => node.tag === 'img');
    assert.equal(images.length, 1, `${id}: exactly one image required`);
    const image = images[0];
    assert.ok(image.attrs.src?.trim(), `${id}: nonempty image src required`);
    const file = localPath(root, image.attrs.src);
    assert.equal(file.relative, `assets/works/${id}-feature-wide.png`, `${id}: image src must match approved card`);
    const data = await fs.readFile(file.absolute);
    const pin = approved[id];
    assert.ok(data.length >= 33 && data.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])) && data.toString('ascii', 12, 16) === 'IHDR', `${id}: valid PNG header required`);
    assert.equal(data.readUInt32BE(16), pin.width, `${id}: natural PNG width`);
    assert.equal(data.readUInt32BE(20), pin.height, `${id}: natural PNG height`);
    assert.equal(image.attrs.width, String(pin.width), `${id}: image width attribute matches natural dimension`);
    assert.equal(image.attrs.height, String(pin.height), `${id}: image height attribute matches natural dimension`);
    assert.equal(data.length, pin.bytes, `${id}: approved image bytes`);
    assert.equal(sha256(data), pin.sha256, `${id}: approved image hash`);
  }
  const resources = new Set();
  const scripts = [];
  const styles = [];
  for (const node of nodes) {
    const resource = node.tag === 'link' ? node.attrs.href : node.attrs.src;
    if (!resource) continue;
    assert.ok(!/^(?:[\w+.-]+:|\/\/)/.test(resource), `External resource / library is not approved: ${resource}`);
    const file = localPath(root, resource);
    await fs.access(file.absolute);
    resources.add(file.relative);
    if (node.tag === 'script') {
      assert.ok(Object.hasOwn(node.attrs, 'defer') && !Object.hasOwn(node.attrs, 'async') && !node.attrs.type, `${resource}: classic defer scripts required for dependency order`);
      scripts.push(file.relative);
    }
    if (node.tag === 'link' && (node.attrs.rel || '').split(/\s+/).includes('stylesheet')) styles.push(file.relative);
  }
  for (const [type, list] of [['script', scripts], ['stylesheet', styles]]) {
    assert.equal(new Set(list).size, list.length, `Duplicate ${type} resource / library hook`);
  }
  assert.deepEqual(scripts, SCRIPT_ORDER, 'Script hooks and dependency order must match the current single-owner site');
  assert.equal(styles.filter(file => file === 'css/works.css').length, 1, 'Exactly one Works CSS hook required');
  assert.equal(styles.filter(file => file === 'css/services.css').length, 1, 'Exactly one Services CSS hook required');
  assert.ok(styles.indexOf('css/services.css') > styles.indexOf('css/works.css'), 'Services CSS should load after Works');
  assert.ok(styles.includes('css/main.css') && styles.indexOf('css/main.css') < styles.indexOf('css/works.css'), 'Works CSS hook must follow main stylesheet');
  assert.equal(styles.filter(file => /(?:^|\/)lenis[^/]*\.css$/i.test(file)).length, 1, 'Exactly one Lenis CSS library required');
  const owners = [];
  for (const node of nodes.filter(node => node.tag === 'script')) {
    assert.ok(node.attrs.src, 'Inline script hooks are not approved');
    const filename = localPath(root, node.attrs.src).relative;
    if (filename.startsWith('assets/vendor/')) continue;
    const source = await fs.readFile(path.join(root, filename), 'utf8');
    new vm.Script(source, { filename });
    // Source-level guard: aliased/dynamically generated constructors need browser verification.
    const code = source.replace(/"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`|\/\/[^\r\n]*|\/\*[\s\S]*?\*\//g, '');
    for (const match of code.matchAll(/\bnew\s+(?:(?:window|globalThis)\s*\.\s*)?Lenis\s*\(/g)) owners.push(filename);
  }
  assert.deepEqual(owners, ['js/hero-scroll.js'], 'Lenis constructor must have exactly one owner: js/hero-scroll.js');
  return { cards: items.length, images: ORDER.length, resources: [...resources] };
}
if (require.main === module) {
  (async () => {
    const root = path.resolve(__dirname, '..');
    const options = parseCLI(process.argv.slice(2));
    const result = await verifyWorks(root);
    const served = options.http ? await verifyHTTP(root, ['index.html', ...result.resources], options.http) : null;
    console.log(`PASS: ${result.cards} ordered Works cards with approved copy, ${result.images} approved PNG hashes/dimensions, unique ids/hooks, valid fragment targets, dependency order, one Lenis owner, ${result.resources.length} local resources.${served === null ? ' Offline checks only.' : ` ${served} HTTP resources match disk.`}`);
  })().catch(error => { console.error(`FAIL: ${error.message}`); process.exitCode = 1; });
}
module.exports = { verifyWorks };
