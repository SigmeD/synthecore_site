'use strict';
// QA only: owner request of 2026-10-22. Restore just the two exact additions
// before comparing against the immutable v27 hashes. Never normalize motion.
const additions = {
  'css/design-tokens.css': {
    before: '  --sc-color-accent-deep: #c63d14;\n',
    after: '  --sc-color-accent-deep: #c63d14;\n  --sc-button-shadow: none;\n  --sc-button-hover-shadow: none;\n',
  },
  'css/shared-header-cta.css': {
    before: '*/\n:root {\n',
    after: '*/\n@import url("./button-interactions.css");\n:root {\n',
  },
};
function restoreV27ButtonShadows(file, text) {
  const addition = additions[file];
  if (!addition) return text;
  if (text.split(addition.after).length !== 2) throw Error('Expected exactly one approved button policy addition: ' + file);
  return text.replace(addition.after, addition.before);
}
module.exports = {restoreV27ButtonShadows};
