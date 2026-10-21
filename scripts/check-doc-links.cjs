// Feed Git's tracked/planned files so ignored local evidence cannot hide broken links.
// git ls-files --cached --others --exclude-standard | node scripts/check-doc-links.cjs
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const files = new Set(fs.readFileSync(0, 'utf8').split(/\r?\n/).filter(Boolean));
if (!files.size) { console.error('FAIL: pipe git ls-files --cached --others --exclude-standard into this check.'); process.exit(1); }
const documents = [...files].filter(file => file === 'README.md' || /^docs\/.*\.md$/.test(file) || file === 'scripts/HISTORICAL_CHECKS.md');
const failures = [];
let checked = 0;
for (const file of documents) {
  const source = fs.readFileSync(path.join(root, file), 'utf8').replace(/```[\s\S]*?```/g, '');
  for (const match of source.matchAll(/!?\[[^\]]*\]\((?:<([^>]+)>|([^\s)]+)(?:\s+"[^"]*")?)\)/g)) {
    const target = match[1] || match[2];
    if (/^(?:[a-z][\w+.-]*:|\/\/|#)/i.test(target)) continue;
    const local = target.split(/[?#]/)[0];
    if (!local) continue;
    let decoded;
    try { decoded = decodeURIComponent(local); }
    catch { failures.push(file + ': invalid encoded path ' + target); continue; }
    const resolved = decoded.startsWith('/') ? path.posix.normalize(decoded.slice(1)) : path.posix.normalize(path.posix.join(path.posix.dirname(file), decoded));
    checked++;
    const directory = [...files].some(candidate => candidate.startsWith(resolved.replace(/\/$/, '') + '/'));
    if (!files.has(resolved) && !directory) failures.push(file + ': target absent from Git files: ' + target);
    else if (!fs.existsSync(path.join(root, resolved))) failures.push(file + ': target absent from disk: ' + target);
  }
}
if (failures.length) { console.error('FAIL: ' + failures.length + ' documentation links\n' + failures.join('\n')); process.exitCode = 1; }
else console.log('PASS: ' + checked + ' local links across ' + documents.length + ' current/historical Markdown documents target supplied Git files.');
