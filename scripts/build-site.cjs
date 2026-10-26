/* Dependency-free build-time shared shell. Commit the generated HTML for static hosting. */
const fs = require('node:fs');
const path = require('node:path');
const {casePages,renderCase}=require('./lib/case-page.cjs');
const {wireCaseLinks}=require('./lib/case-links.cjs');
const {renderHomeCopy}=require('./lib/project-copy.cjs');
const {renderContactRelated}=require('./lib/get-started-page.cjs');
const {BUNDLE_PATH,bundleHomeHead,buildHomeCSS}=require('./lib/home-styles.cjs');
const PAGES = {home:'index.html', works:'raboty/index.html', 'get-started':'get-started/index.html', privacy:'privacy/index.html'};
const read = (root, file) => fs.readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n');

function renderPage(root, page) {
  const data=Object.hasOwn(PAGES,page)?null:casePages(root).find(data=>data.slug===page);
  if (!Object.hasOwn(PAGES, page)&&!data) throw new Error(`Unknown page: ${page}`);
  const values = {
    header: read(root, 'templates/partials/header.html').trim(),
    footer: read(root, 'templates/partials/footer.html').trim(),
    home: page === 'home' ? '' : '/',
    worksCurrent: page === 'works' ? ' aria-current="page"' : '',
  };
  let template=data?renderCase(root,data):read(root, `templates/pages/${page}.html`);
  if(page==='get-started')template=template.replace('{{contactRelated}}',()=>renderContactRelated(root));
  const output = (data?template:wireCaseLinks(page,page==='home'?renderHomeCopy(root,template):template,casePages(root)))
    .replace(/\{\{(header|footer)\}\}/g, (_, key) => values[key])
    .replace(/\{\{(home|worksCurrent)\}\}/g, (_, key) => values[key]);
  if (/\{\{[^}]+\}\}/.test(output)) throw new Error(`Unresolved template marker in ${page}`);
  return page==='home'?bundleHomeHead(output):output;
}

function build(root, check = false) {
  const css=buildHomeCSS(root).css,cssFile=path.join(root,BUNDLE_PATH);
  if(check){if(!fs.existsSync(cssFile)||fs.readFileSync(cssFile,'utf8')!==css)throw new Error(`${BUNDLE_PATH} is stale; run node scripts/build-site.cjs`)}
  else{fs.mkdirSync(path.dirname(cssFile),{recursive:true});fs.writeFileSync(cssFile,css)}
  const pages={...PAGES,...Object.fromEntries(casePages(root).map(data=>[data.slug,`raboty/${data.slug}/index.html`]))};
  for (const [page, file] of Object.entries(pages)) {
    const output = renderPage(root, page), destination = path.join(root, file);
    if (check) {
      if (!fs.existsSync(destination) || read(root, file) !== output) throw new Error(`${file} is stale; run node scripts/build-site.cjs`);
    } else {
      fs.mkdirSync(path.dirname(destination), {recursive:true});
      fs.writeFileSync(destination, output);
    }
  }
}
if (require.main === module) {
  try {
    const args=process.argv.slice(2);
    if (args.some(a=>a!=='--check')) throw new Error('Usage: node scripts/build-site.cjs [--check]');
    build(path.resolve(__dirname, '..'),args.includes('--check'));
    console.log(`PASS: shared Header/Footer ${args.includes('--check')?'are current in':'generated for'} home, catalog and case routes.`);
  } catch(error) {console.error(error.message);process.exitCode=1;}
}
module.exports={renderPage,build};
