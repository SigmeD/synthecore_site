'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),crypto=require('node:crypto');
const {restoreLaterCaseLinks,restoreWorksGeometry}=require('./lib/case-baseline.cjs');
const {restoreDiscussionLinks}=require('./lib/approved-discussion-links.cjs');
const hash=text=>crypto.createHash('sha256').update(text).digest('hex');
test('joint integration preserves every complete case and its styles against accepted branch snapshots',()=>{
 const audit=JSON.parse(fs.readFileSync('docs/qa/case-integration/source-audit.json','utf8'));
 for(const [file,source]of Object.entries(audit.pages))assert.equal(hash(restoreLaterCaseLinks(fs.readFileSync(file,'utf8').replace(/\r\n/g,'\n'),file)),source.normalizedBaselineSHA256,file);
 for(const [file,source]of Object.entries(audit.runtime)){const bytes=restoreWorksGeometry(file,fs.readFileSync(file));assert.equal(hash(source.normalizesLineEndings?restoreDiscussionLinks(file,bytes.toString('utf8').replace(/\r\n/g,'\n')):bytes),source.baselineSHA256,file)}
});
test('baseline comparison refuses malformed registered routes instead of hiding them',()=>{
 const html=fs.readFileSync('raboty/beauty-insight/index.html','utf8');
 assert.throws(()=>restoreLaterCaseLinks(html.replace('href="/raboty/flowers/"','href="/raboty/broken-flowers/"'),'raboty/beauty-insight/index.html'));
 assert.throws(()=>restoreLaterCaseLinks(html.replace('href="/raboty/metal-calc/"','href="https://example.com/"'),'raboty/beauty-insight/index.html'));
});
