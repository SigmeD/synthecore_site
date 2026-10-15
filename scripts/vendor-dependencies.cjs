// Download fixed, official npm distribution files; the page never needs a CDN.
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const files = [
  ['lenis-1.3.26.min.js', 'https://cdn.jsdelivr.net/npm/lenis@1.3.26/dist/lenis.min.js'],
  ['lenis-1.3.26.css', 'https://cdn.jsdelivr.net/npm/lenis@1.3.26/dist/lenis.css'],
  ['LENIS-LICENSE.txt', 'https://cdn.jsdelivr.net/npm/lenis@1.3.26/LICENSE'],
  ['gsap-3.12.5.min.js', 'https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/gsap.min.js'],
  ['ScrollTrigger-3.12.5.min.js', 'https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/ScrollTrigger.min.js'],
  ['GSAP-package.json', 'https://cdn.jsdelivr.net/npm/gsap@3.12.5/package.json'],
];
(async () => {
  const directory = path.join(root, 'assets/vendor');
  await fs.mkdir(directory, { recursive: true });
  const manifest = [];
  for (const [name, url] of files) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
    const data = Buffer.from(await response.arrayBuffer());
    if (!data.length) throw new Error(`Empty vendor file: ${name}`);
    await fs.writeFile(path.join(directory, name), data);
    manifest.push({ path: `assets/vendor/${name}`, source: url, bytes: data.length,
      sha256: crypto.createHash('sha256').update(data).digest('hex') });
  }
  const gsap = await fs.readFile(path.join(directory, 'gsap-3.12.5.min.js'), 'utf8');
  const licenseHeader = gsap.match(/\/\*![\s\S]*?\*\//)?.[0];
  if (!licenseHeader) throw new Error('GSAP distribution license header missing');
  const licenseText = licenseHeader + '\n\nThe package license metadata is preserved in GSAP-package.json.\n';
  await fs.writeFile(path.join(directory, 'GSAP-LICENSE.txt'), licenseText);
  manifest.push({ path: 'assets/vendor/GSAP-LICENSE.txt', source: 'https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/gsap.min.js',
    bytes: Buffer.byteLength(licenseText), sha256: crypto.createHash('sha256').update(licenseText).digest('hex') });
  await fs.writeFile(path.join(root, 'docs/vendor-manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  console.log(`Saved ${manifest.length} fixed vendor files and SHA-256 manifest.`);
})().catch(error => { console.error(error); process.exitCode = 1; });
