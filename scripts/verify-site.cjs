'use strict';
// Single entry point; individual validators remain reusable and independently runnable.
const fs=require('node:fs'),path=require('node:path'),{spawnSync,execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');
function run(args){const result=spawnSync(process.execPath,args,{cwd:root,stdio:'inherit'});if(result.error)throw result.error;if(result.status!==0)throw Error('Verification failed: node '+args.join(' '))}
function main(args){
 let http=null,ref=null;
 for(let i=0;i<args.length;i++){
  if(args[i]==='--http'){http=args[++i];if(!/^https?:\/\//.test(http||''))throw Error('--http requires an HTTP URL')}
  else if(args[i]==='--git-ref'){ref=args[++i];if(!ref||ref.startsWith('-'))throw Error('--git-ref requires HEAD or a Git ref')}
  else if(args[i]==='--help'){console.log('node scripts/verify-site.cjs [--http http://127.0.0.1:4176/] [--git-ref HEAD]\nChecks build, source locks, static contracts, all test-*.cjs and documentation links. Browser suites remain explicit.');return}
  else throw Error('Unknown argument '+args[i]);
 }
 run(['scripts/build-site.cjs','--check']);run(['scripts/verify-v62-import.cjs']);
 run(['docs/qa/v62-on-v27/verify-git.cjs',...(ref?[ref]:[])]);
 run(['scripts/check-project.cjs',...(http?['--http',http]:[])]);
 run(['scripts/verify-services-static.cjs']);run(['scripts/verify-sticky-handoff-v61.cjs']);
 const tests=fs.readdirSync(path.join(root,'scripts')).filter(f=>/^test-.*\.cjs$/.test(f)).sort().map(f=>'scripts/'+f);run(['--test',...tests]);
 const files=execFileSync('git',['ls-files','--cached','--others','--exclude-standard'],{cwd:root,encoding:'utf8'});
 const links=spawnSync(process.execPath,['scripts/check-doc-links.cjs'],{cwd:root,input:files,encoding:'utf8'});process.stdout.write(links.stdout||'');process.stderr.write(links.stderr||'');if(links.status!==0)throw Error('Documentation links failed');
 console.log('PASS: complete supported verification suite.');
}
if(require.main===module){try{main(process.argv.slice(2))}catch(error){console.error(error.message);process.exitCode=1}}
module.exports={main};
