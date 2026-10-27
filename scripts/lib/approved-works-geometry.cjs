'use strict';
// Owner-approved v34 source changes only. Historical manifests remain intact.
// Reverse exact contextual replacements, preserving the original LF/CRLF bytes,
// then require the complete historical file hash: unrelated edits cannot hide.
const assert=require('node:assert/strict'),crypto=require('node:crypto');
const registry=require('./approved-works-geometry.json');
const WORKS_GEOMETRY_FILES=Object.freeze(Object.keys(registry));
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
function restoreWorksGeometry(file,bytes){
 const entry=registry[file];if(!entry)return bytes;
 assert.ok(Buffer.isBuffer(bytes),'Works geometry restoration requires raw bytes');
 if(hash(bytes)===entry.originalSHA256)return bytes;
 let restored=bytes.toString('utf8');
 for(const [before,after]of [...entry.patches].reverse()){
  const from=after.replace(/\n/g,entry.eol),to=before.replace(/\n/g,entry.eol);
  assert.equal(restored.split(from).length,2,'Expected one exact approved Works geometry patch: '+file);
  restored=restored.replace(from,to);
 }
 const result=Buffer.from(restored,'utf8');
 assert.equal(hash(result),entry.originalSHA256,'Unapproved bytes outside Works geometry patch: '+file);
 return result;
}
module.exports={restoreWorksGeometry,WORKS_GEOMETRY_FILES};
