const path = require('node:path');
const { verifyWorks } = require('./verify-works-static.cjs');
const { verifyManifest, verifyHTTP, parseCLI } = require('./lib/static-resources.cjs');

async function verifyProject(root = path.resolve(__dirname, '..'), options = {}) {
  const works = await verifyWorks(root);
  let hashes = 0;
  for (const manifest of ['docs/asset-manifest.json', 'docs/vendor-manifest.json']) {
    hashes += await verifyManifest(root, manifest);
  }
  // Retain portable crop/geometry assertions without spawning a process.
  require('./check-hero-geometry.cjs');
  const served = options.http ? await verifyHTTP(root, ['index.html', ...works.resources], options.http) : null;
  return { ...works, hashes, served };
}

if (require.main === module) {
  (async () => {
    const result = await verifyProject(path.resolve(__dirname, '..'), parseCLI(process.argv.slice(2)));
    console.log(`PASS: current v31 structure/resources, ${result.images} approved Works images, ${result.hashes} vendor/asset manifest hashes.${result.served === null ? ' Offline checks only; use --http [URL] to compare served bytes.' : ` ${result.served} HTTP resources match disk.`}`);
  })().catch(error => { console.error(`FAIL: ${error.message}`); process.exitCode = 1; });
}
module.exports = { verifyProject };
