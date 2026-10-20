/* Dependency-free build-time shared shell. Commit the generated HTML for static hosting. */
const fs = require('node:fs');
const path = require('node:path');
const PAGES = {home:'index.html', works:'raboty/index.html'};
const read = (root, file) => fs.readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n');

function renderPage(root, page) {
  if (!Object.hasOwn(PAGES, page)) throw new Error(`Unknown page: ${page}`);
  const values = {
    header: read(root, 'templates/partials/header.html').trim(),
    footer: read(root, 'templates/partials/footer.html').trim(),
    home: page === 'home' ? '' : '/',
    worksCurrent: page === 'works' ? ' aria-current="page"' : '',
  };
  const output = read(root, `templates/pages/${page}.html`)
    .replace(/\{\{(header|footer)\}\}/g, (_, key) => values[key])
    .replace(/\{\{(home|worksCurrent)\}\}/g, (_, key) => values[key]);
  if (/\{\{[^}]+\}\}/.test(output)) throw new Error(`Unresolved template marker in ${page}`);
  return output;
}

function build(root, check = false) {
  for (const [page, file] of Object.entries(PAGES)) {
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
    console.log(`PASS: shared Header/Footer ${args.includes('--check')?'are current in':'generated for'} / and /raboty/.`);
  } catch(error) {console.error(error.message);process.exitCode=1;}
}
module.exports={renderPage,build};
