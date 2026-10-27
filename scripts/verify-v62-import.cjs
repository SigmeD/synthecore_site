#!/usr/bin/env node
/**
 * V62 handoff verifier. Node.js built-ins only.
 * Usage:
 *   node scripts/verify-v62-import.cjs          -> 13 raw locks + 4 exact v34 geometry/resize exceptions
 *   node scripts/verify-v62-import.cjs --strict -> historical raw archive comparison (no exceptions)
 * Files created solely for v2 handoff documentation are outside source_files_sha256.
 */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const {restoreWorksGeometry,WORKS_GEOMETRY_FILES}=require('./lib/approved-works-geometry.cjs');
const root = path.resolve(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root,'docs','V62_SOURCE_SHA256.json'),'utf8'));
const strict = process.argv.includes('--strict');
const hashes = strict ? manifest.source_files_sha256 : manifest.motion_lock;
let ok=0, geometry=0, failures=[];
for (const [relative, expected] of Object.entries(hashes)) {
  const full=path.resolve(root,relative);
  if (!full.startsWith(root + path.sep)) {failures.push(`${relative}: invalid path`);continue;}
  if (!fs.existsSync(full)) {failures.push(`${relative}: MISSING`); continue;}
  let bytes=fs.readFileSync(full);
  const approvedGeometry=!strict&&WORKS_GEOMETRY_FILES.includes(relative);
  try{if(approvedGeometry)bytes=restoreWorksGeometry(relative,bytes)}catch(error){failures.push(`${relative}: ${error.message}`);continue;}
  const actual=crypto.createHash('sha256').update(bytes).digest('hex');
  if (actual!==expected) failures.push(`${relative}: SHA MISMATCH (expected ${expected}, actual ${actual})`);
  else if(approvedGeometry)geometry++;else ok++;
}
if (strict && !('index.html' in hashes)) failures.push('index.html missing from strict manifest');
console.log(strict?`SyntheCore v62 STRICT SOURCE: ${ok}/${Object.keys(hashes).length} raw matched (historical archive, no exceptions).`:`SyntheCore v62/v34: ${ok}/${Object.keys(hashes).length-WORKS_GEOMETRY_FILES.length} raw motion locks; ${geometry}/${WORKS_GEOMETRY_FILES.length} exact approved geometry files restored to original SHA.`);
for(const msg of failures) console.error('FAIL',msg);
if(failures.length) process.exitCode=1;
