/* Pure crop geometry shared by the browser controller and Node checks. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.SyntheCoreHeroGeometry = factory();
})(typeof window === 'object' ? window : globalThis, function () {
  function createGeometry(hero, frame, source, position = { x: .53, y: .55 }) {
    if (![hero.width, hero.height, frame.width, frame.height, source.width, source.height]
      .every(value => Number.isFinite(value) && value > 0)) return null;

    const cover = Math.max(hero.width / source.width, hero.height / source.height);
    const startCover = Math.max(frame.width / source.width, frame.height / source.height);
    const width = source.width * cover, height = source.height * cover;
    const scale = startCover / cover;
    return {
      image: { width, height },
      start: {
        scale,
        x: frame.x + (frame.width - width * scale) * position.x,
        y: frame.y + (frame.height - height * scale) * position.y,
      },
      end: { scale: 1, x: (hero.width - width) * position.x, y: (hero.height - height) * position.y },
      startMask: `inset(${frame.y}px ${hero.width - frame.x - frame.width}px ${hero.height - frame.y - frame.height}px ${frame.x}px round ${frame.radius}px)`,
      endMask: `inset(0px 0px 0px 0px round ${hero.radius}px)`,
    };
  }
  function coverageProgress(hero, frame, text) {
    const fraction = (distance, travel) => distance <= 0 ? 0 : travel > 0 ? distance / travel : 1;
    return Math.min(1, Math.max(
      fraction(frame.x - text.x, frame.x),
      fraction(frame.y - text.y, frame.y),
      fraction(text.x + text.width - frame.x - frame.width, hero.width - frame.x - frame.width),
      fraction(text.y + text.height - frame.y - frame.height, hero.height - frame.y - frame.height),
    ));
  }
  return { createGeometry, coverageProgress };
});
