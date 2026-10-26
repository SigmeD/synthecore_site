'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),crypto=require('node:crypto'),os=require('node:os');
const root=path.resolve(__dirname,'..'),base='91235aa239d49effb90bde72409d6f6f5db49e7b';
const files=['css/main.css','css/works.css','css/sticky-handoff-v61.css','js/works.js'];
const read=file=>fs.readFileSync(path.join(root,file));
const original=file=>cp.execFileSync('git',['show',base+':'+file],{cwd:root});
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');

test('v34 verifier accepts the precise geometry exception and reports raw and restored counts separately',()=>{
 const result=cp.spawnSync(process.execPath,['scripts/verify-v62-import.cjs'],{cwd:root,encoding:'utf8'});
 assert.equal(result.status,0,result.stdout+result.stderr);
 assert.match(result.stdout,/13\/13 raw/);assert.match(result.stdout,/4\/4.*geometry/);
 assert.doesNotMatch(result.stdout,/17\/17.*(?:raw|MOTION LOCK)/);
});

test('only the exact four v34 source patches restore their original bytes, including EOL',()=>{
 const {restoreWorksGeometry,WORKS_GEOMETRY_FILES}=require('./lib/approved-works-geometry.cjs');
 assert.deepEqual([...WORKS_GEOMETRY_FILES],files);
 for(const file of files){
  assert.deepEqual(restoreWorksGeometry(file,read(file)),original(file),file);
  assert.deepEqual(restoreWorksGeometry(file,original(file)),original(file),'historical snapshot '+file);
 }
 for(const file of ['js/services.js','css/faq-footer.css','js/hero-scroll.js'])assert.deepEqual(restoreWorksGeometry(file,read(file)),read(file));
 for(const file of ['docs/V62_SOURCE_SHA256.json','docs/V62_ON_V27_SOURCES.json'])assert.deepEqual(read(file),original(file),'original manifest '+file);
});

test('geometry reversal refuses changed dimensions, glass, Hero, neighbors, extra CSS, partial patches and EOL conversion',()=>{
 const {restoreWorksGeometry}=require('./lib/approved-works-geometry.cjs');
 const mutations=[
  ['css/main.css','74.2svh','74.3svh'],
  ['css/main.css','--hero-edge:clamp(12px,1vw,18px)','--hero-edge:clamp(13px,1vw,18px)'],
  ['css/main.css','#f9fcff','#f9fcfe'],
  ['css/works.css','--works-hold:50svh','--works-hold:49svh'],
  ['css/works.css','max-width:100%','max-width:99%'],
  ['css/works.css','backdrop-filter:','backdrop-filter:none;--changed:'],
  ['css/sticky-handoff-v61.css','var(--works-hold)','51svh'],
  ['css/sticky-handoff-v61.css','.sc-services.sc-services--pinned','.changed-services'],
  ['js/works.js','scrollScreensPerCard: 0.92','scrollScreensPerCard: 0.93'],
  ['js/works.js',"cardEase: 'sine.inOut'","cardEase: 'none'"],
  ['js/works.js',"'--glass-y':'8px'","'--glass-y':'9px'"],
  ['js/works.js','      setup();','      reset();'],
 ];
 for(const [file,before,after]of mutations){const text=read(file).toString();assert.ok(text.includes(before),before);assert.throws(()=>restoreWorksGeometry(file,Buffer.from(text.replace(before,after))),/geometry|patch|bytes/i,file+': '+after)}
 for(const file of files){
  assert.throws(()=>restoreWorksGeometry(file,Buffer.concat([read(file),Buffer.from('\n.extra{color:red}\n')])),/geometry|patch|bytes/i);
  assert.throws(()=>restoreWorksGeometry(file,Buffer.from(read(file).toString().replace(/\r?\n/g,read(file).includes(Buffer.from('\r\n'))?'\n':'\r\n'))),/geometry|patch|bytes/i);
 }
 const partial=read('css/main.css').toString().replace('border-radius:var(--hero-surface-radius);','border-radius:clamp(20px,1.5vw,30px);');
 assert.throws(()=>restoreWorksGeometry('css/main.css',Buffer.from(partial)),/geometry|patch|bytes/i);
});

test('historical bundle restoration checks actual source compilation before reversing source geometry',()=>{
 const {restoreWorksGeometry}=require('./lib/case-baseline.cjs'),file='css/generated/home.css';
 assert.deepEqual(restoreWorksGeometry(file,read(file)),original(file));
 assert.throws(()=>restoreWorksGeometry(file,Buffer.concat([read(file),Buffer.from('\n.extra{color:red}\n')])),/Compiled stylesheet/);
 assert.throws(()=>restoreWorksGeometry(file,original(file)),/Compiled stylesheet/,'stale original bundle cannot conceal changed sources');
});

test('strict archive comparison retains raw historical failures without applying geometry exceptions',()=>{
 const result=cp.spawnSync(process.execPath,['scripts/verify-v62-import.cjs','--strict'],{cwd:root,encoding:'utf8',maxBuffer:4*1024*1024});
 assert.equal(result.status,1);assert.match(result.stdout,/STRICT SOURCE:.*raw matched.*no exceptions/);
 for(const file of files)assert.ok(result.stderr.includes('FAIL '+file+': SHA MISMATCH'),file);
 assert.doesNotMatch(result.stdout,/geometry files restored/);
});

test('Git index checks use index CSS and bundle bytes and reject unauthorized index changes',()=>{
 const folder=fs.mkdtempSync(path.join(os.tmpdir(),'synthecore-works-v34-')),env={...process.env,GIT_INDEX_FILE:path.join(folder,'index')};
 const git=args=>cp.execFileSync('git',args,{cwd:root,env});
 const stage=(file,bytes)=>{const oid=cp.execFileSync('git',['hash-object','-w','--stdin'],{cwd:root,env,input:bytes,encoding:'utf8'}).trim();git(['update-index','--add','--cacheinfo','100644',oid,file])};
 const verify=()=>{const result=cp.spawnSync(process.execPath,['docs/qa/v62-on-v27/verify-git.cjs'],{cwd:root,env,encoding:'utf8'});return {status:result.status,...JSON.parse(result.stdout)}};
 try{
  git(['read-tree',base]);
  assert.equal(verify().pass,true,'original ref remains valid');
  for(const file of [...files,'css/generated/home.css'])stage(file,read(file));
  let result=verify();assert.equal(result.pass,true,JSON.stringify(result));assert.equal(result.rawMotionFiles,13);assert.equal(result.approvedGeometryFiles,4);assert.equal(result.compiledHomeCSSMatches,true);
  stage('css/works.css',Buffer.from(read('css/works.css').toString().replace('--works-hold:50svh','--works-hold:49svh')));
  result=verify();assert.equal(result.pass,false);assert.ok(result.failures.some(f=>f.includes('css/works.css')));assert.equal(result.compiledHomeCSSMatches,false);
  stage('css/works.css',read('css/works.css'));stage('css/generated/home.css',original('css/generated/home.css'));
  result=verify();assert.equal(result.pass,false);assert.equal(result.compiledHomeCSSMatches,false);
  stage('css/generated/home.css',read('css/generated/home.css'));
  for(const file of ['js/works.js','css/faq-footer.css','js/hero-scroll.js','css/site-footer.css']){
   stage(file,Buffer.concat([original(file),Buffer.from('\n/* unauthorized */\n')]));result=verify();assert.equal(result.pass,false,file);stage(file,original(file));
  }
 }finally{
  assert.equal(path.dirname(path.resolve(folder)),path.resolve(os.tmpdir()));assert.ok(path.basename(folder).startsWith('synthecore-works-v34-'));
  fs.rmSync(folder,{recursive:true,force:true});
 }
});
