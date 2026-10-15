const assert = require('node:assert/strict');
const { createGeometry, coverageProgress } = require('../js/hero-geometry.js');

// Cover must fill the moving mask at every step without stretching the image.
for (const [width, height] of [[1340, 707], [1884, 801], [3804, 968], [900, 620]]) {
  for (const [naturalWidth, naturalHeight] of [[1536, 1024], [1920, 1080], [800, 1600]]) {
    const rect = { x: width / 2 - 250, y: 240, width: 500, height: 281.25, radius: 24 };
    const result = createGeometry({ width, height, radius: 30 }, rect, { width: naturalWidth, height: naturalHeight }, { x: .53, y: .55 });
    assert.ok(result);
    assert.equal(result.image.width / result.image.height, naturalWidth / naturalHeight);
    for (const progress of [0, .25, .5, .75, 1]) {
      const lerp = (a, b) => a + (b - a) * progress;
      const mask = { x: lerp(rect.x, 0), y: lerp(rect.y, 0), width: lerp(rect.width, width), height: lerp(rect.height, height) };
      const image = { x: lerp(result.start.x, result.end.x), y: lerp(result.start.y, result.end.y), scale: lerp(result.start.scale, 1) };
      const epsilon = .001;
      assert.ok(image.x <= mask.x + epsilon);
      assert.ok(image.y <= mask.y + epsilon);
      assert.ok(image.x + result.image.width * image.scale >= mask.x + mask.width - epsilon);
      assert.ok(image.y + result.image.height * image.scale >= mask.y + mask.height - epsilon);
    }
    assert.ok(result.startMask.startsWith(`inset(${rect.y}px`));
    assert.equal(result.endMask, 'inset(0px 0px 0px 0px round 30px)');
  }
}
assert.equal(createGeometry({ width: 0, height: 800 }, {}, { width: 100, height: 100 }), null);
assert.equal(createGeometry({ width: 1000, height: 800 }, { width: 0, height: 100 }, { width: 100, height: 100 }), null);
assert.equal(createGeometry({ width: 1000, height: 800 }, { width: 100, height: 100 }, { width: 0, height: 0 }), null);
const panel = { width: 1884, height: 801 };
const frame = { x: 680, y: 285, width: 524, height: 295 };
const title = { x: 374, y: 100, width: 1136, height: 125 };
const covered = coverageProgress(panel, frame, title);
assert.ok(covered > .64 && covered < .66, 'Do not lighten the title while its upper line remains on blue');
assert.ok(285 * (1 - covered) <= title.y + .001);
assert.equal(coverageProgress(panel, frame, { x: 800, y: 300, width: 100, height: 100 }), 0);
console.log('PASS: 12 image/viewport combinations, 60 crop states, zero-size guards.');
