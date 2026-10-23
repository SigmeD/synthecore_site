'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const crypto = require('node:crypto');
const path = require('node:path');
const {restoreV27ButtonShadows} = require('./lib/approved-button-shadows.cjs');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n');

test('button policy exception accepts only the exact two additions to v27', () => {
  const manifest = JSON.parse(read('docs/V62_ON_V27_SOURCES.json'));
  const accepted = (file, source) => {
    try {return crypto.createHash('sha256').update(restoreV27ButtonShadows(file, source)).digest('hex') === manifest.v27[file];}
    catch {return false;}
  };
  for (const file of ['css/design-tokens.css', 'css/shared-header-cta.css']) {
    const source = read(file);
    assert.ok(accepted(file, source), file);
    const alteredPolicy = file.endsWith('design-tokens.css')
      ? source.replace('--sc-button-shadow: none;', '--sc-button-shadow: 0 0 8px orange;')
      : source.replace('./button-interactions.css', './other-buttons.css');
    assert.equal(accepted(file, alteredPolicy), false, 'reject altered tokens or import');
    const addition = file.endsWith('design-tokens.css')
      ? '  --sc-button-shadow: none;\n  --sc-button-hover-shadow: none;\n'
      : '@import url("./button-interactions.css");\n';
    assert.equal(accepted(file, source.replace(addition, '') + addition), false, 'reject misplaced policy');
    assert.equal(accepted(file, source + '\n.main-cta{height:99px}\n'), false, 'reject unrelated geometry edits');
    assert.equal(accepted(file, source.replace('--sc-font-size-body', '--changed-font-size-body')), false, 'reject typography edits');
    assert.equal(accepted(file, source + source), false, 'reject duplicated policy');
  }
});

test('QA does not exempt protected motion files or unrelated components', () => {
  for (const file of ['css/main.css', 'css/faq-footer.css', 'css/process.css', 'css/raboty-cards.css', 'css/site-footer.css']) {
    const source = read(file);
    assert.equal(restoreV27ButtonShadows(file, source), source);
  }
});
