const assert = require('node:assert/strict');
const VOID = new Set('area base br col embed hr img input link meta param source track wbr'.split(' '));
const entities = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: '\u00a0' };
function decode(value) {
  return value.replace(/&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi, (match, key) => {
    if (key[0] !== '#') return entities[key.toLowerCase()];
    const code = key[1].toLowerCase() === 'x' ? parseInt(key.slice(2), 16) : Number(key.slice(1));
    return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : '\ufffd';
  });
}
// Strict tokenizer for explicit static HTML, not an HTML5 error-recovery parser.
// Stack-based nesting, quoted attributes and raw-text elements retain descendants.
function parseHTML(source) {
  const root = { tag: '#document', attrs: {}, children: [] };
  const stack = [root];
  const nodes = [];
  let cursor = 0;
  while (cursor < source.length) {
    if (source.startsWith('<!--', cursor)) {
      const end = source.indexOf('-->', cursor + 4);
      assert.ok(end >= 0, 'Unclosed HTML comment');
      cursor = end + 3; continue;
    }
    if (/^<!doctype\b/i.test(source.slice(cursor, cursor + 10))) {
      const end = source.indexOf('>', cursor);
      assert.ok(end >= 0, 'Unclosed doctype');
      cursor = end + 1; continue;
    }
    if (source[cursor] !== '<') {
      let end = source.indexOf('<', cursor);
      if (end < 0) end = source.length;
      stack.at(-1).children.push(decode(source.slice(cursor, end)));
      cursor = end; continue;
    }
    const closing = /^<\/\s*([\w:-]+)\s*>/.exec(source.slice(cursor));
    if (closing) {
      assert.equal(stack.at(-1).tag, closing[1].toLowerCase(), `Invalid closing tag / nesting near ${closing[0]}`);
      stack.pop(); cursor += closing[0].length; continue;
    }
    const opening = /^<([\w:-]+)/.exec(source.slice(cursor));
    assert.ok(opening, `Invalid HTML tag at offset ${cursor}`);
    const node = { tag: opening[1].toLowerCase(), attrs: {}, children: [], parent: stack.at(-1), index: nodes.length };
    cursor += opening[0].length;
    let selfClosing = false;
    for (;;) {
      cursor += /^\s*/.exec(source.slice(cursor))[0].length;
      if (source.startsWith('/>', cursor)) { selfClosing = true; cursor += 2; break; }
      if (source[cursor] === '>') { cursor++; break; }
      const attribute = /^([^\s=<>/]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/.exec(source.slice(cursor));
      assert.ok(attribute, `Unclosed or invalid attributes in <${node.tag}>`);
      const name = attribute[1].toLowerCase();
      assert.ok(!Object.hasOwn(node.attrs, name), `Duplicate attribute ${name}`);
      node.attrs[name] = decode(attribute[2] ?? attribute[3] ?? attribute[4] ?? '');
      cursor += attribute[0].length;
    }
    node.parent.children.push(node); nodes.push(node);
    if (['script', 'style', 'textarea', 'title'].includes(node.tag) && !selfClosing) {
      const end = new RegExp(`</${node.tag}\\s*>`, 'ig'); end.lastIndex = cursor;
      const match = end.exec(source);
      assert.ok(match, `Unclosed <${node.tag}>`);
      node.children.push(source.slice(cursor, match.index)); cursor = end.lastIndex;
    } else if (!VOID.has(node.tag) && !selfClosing) stack.push(node);
  }
  assert.equal(stack.length, 1, `Unclosed HTML element <${stack.at(-1).tag}>`);
  return { root, nodes };
}
const hasClass = (node, name) => (node.attrs.class || '').split(/\s+/).includes(name);
const textContent = node => node.children.map(child => typeof child === 'string' ? child : textContent(child)).join(' ').trim();
const inside = (node, ancestor) => {
  for (let parent = node.parent; parent; parent = parent.parent) if (parent === ancestor) return true;
  return false;
};
module.exports = { parseHTML, hasClass, textContent, inside };
