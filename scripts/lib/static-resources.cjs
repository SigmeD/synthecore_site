const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const sha256 = data => crypto.createHash('sha256').update(data).digest('hex');
function localPath(root, resource) {
  assert.ok(resource && !/^(?:[\w+.-]+:|\/\/)/.test(resource), `Expected local resource: ${resource}`);
  const clean = decodeURIComponent(resource.split(/[?#]/)[0]);
  assert.ok(!clean.includes('\\') && !clean.includes('\0'), `Invalid resource path: ${resource}`);
  const absolute = path.resolve(root, '.' + (clean.startsWith('/') ? clean : '/' + clean));
  const relative = path.relative(root, absolute);
  assert.ok(relative && !relative.startsWith('..') && !path.isAbsolute(relative), `Resource outside project: ${resource}`);
  return { absolute, relative: relative.split(path.sep).join('/') };
}
async function verifyManifest(root, manifest) {
  const entries = JSON.parse(await fs.readFile(path.join(root, manifest), 'utf8'));
  assert.ok(Array.isArray(entries) && entries.length > 0, `${manifest}: nonempty manifest required`);
  for (const entry of entries) {
    const data = await fs.readFile(localPath(root, entry.path).absolute);
    assert.equal(data.length, entry.bytes, `${entry.path}: manifest bytes`);
    assert.equal(sha256(data), entry.sha256, `${entry.path}: manifest hash`);
  }
  return entries.length;
}
async function verifyHTTP(root, resources, baseURL) {
  const base = new URL(baseURL);
  assert.ok(['http:', 'https:'].includes(base.protocol), 'HTTP URL required');
  if (!base.pathname.endsWith('/')) base.pathname += '/';
  for (const resource of resources) {
    const response = await fetch(new URL(resource, base), { signal: AbortSignal.timeout(10000) });
    assert.equal(response.status, 200, `${resource}: HTTP status`);
    const data = Buffer.from(await response.arrayBuffer());
    assert.ok(data.equals(await fs.readFile(localPath(root, resource).absolute)), `${resource}: HTTP bytes differ from disk`);
  }
  return resources.length;
}
function parseCLI(args) {
  let http = null;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--http') http = /^https?:\/\//.test(args[i + 1] || '') ? args[++i] : 'http://127.0.0.1:4173/';
    else if (/^https?:\/\//.test(args[i]) && !http) http = args[i];
    else throw new Error(`Unknown argument: ${args[i]}. Usage: [--http [http://127.0.0.1:4173/]]`);
  }
  return { http };
}
module.exports = { localPath, sha256, verifyManifest, verifyHTTP, parseCLI };
