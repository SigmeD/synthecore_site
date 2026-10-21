
/* Page effects (footer SVG + scroll animation remain owned by the v60 component). */
(() => {
  const surface = document.querySelector('.works-surface');
  if (!surface) return;
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const motionEnabled = document.documentElement.classList.contains('sc-works-motion') && !reduceMotion.matches;
  if (!motionEnabled) return;

  // Minimal background-only parallax. Calculate progress from the element's box,
  // so no arbitrary document scrollY thresholds or hard-coded section height.
  let raf = 0;
  const update = () => {
    raf = 0;
    const r = surface.getBoundingClientRect();
    const viewHeight = window.innerHeight;
    const progress = Math.max(0, Math.min(1, (viewHeight - r.top) / (viewHeight + r.height)));
    surface.style.setProperty('--surface-art-shift', (progress * 18).toFixed(2) + 'px');
  };
  const schedule = () => { if (!raf) raf = requestAnimationFrame(update); };
  addEventListener('scroll', schedule, {passive:true});
  addEventListener('resize', schedule, {passive:true});
  update();

})();
