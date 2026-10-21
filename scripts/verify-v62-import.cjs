#!/usr/bin/env node
/**
 * V62 handoff verifier. Node.js built-ins only.
 * Usage:
 *   node scripts/verify-v62-import.cjs          -> check all 17 protected motion files
 *   node scripts/verify-v62-import.cjs --strict -> also check 437 approved baseline files
 * Files created solely for v2 handoff documentation are outside source_files_sha256.
 */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root,'docs','V62_SOURCE_SHA256.json'),'utf8'));
const strict = process.argv.includes('--strict');
const hashes = strict ? manifest.source_files_sha256 : manifest.motion_lock;
let ok=0, failures=[];
for (const [relative, expected] of Object.entries(hashes)) {
  const full=path.resolve(root,relative);
  if (!full.startsWith(root + path.sep)) {failures.push(`${relative}: invalid path`);continue;}
  if (!fs.existsSync(full)) {failures.push(`${relative}: MISSING`); continue;}
  const actual=crypto.createHash('sha256').update(fs.readFileSync(full)).digest('hex');
  if (actual!==expected) failures.push(`${relative}: SHA MISMATCH (expected ${expected}, actual ${actual})`);
  else ok++;
}
if (strict && !('index.html' in hashes)) failures.push('index.html missing from strict manifest');
console.log(`SyntheCore v62 ${strict?'STRICT SOURCE':'MOTION LOCK'}: ${ok}/${Object.keys(hashes).length} matched.`);
for(const msg of failures) console.error('FAIL',msg);
if(failures.length) process.exitCode=1;
