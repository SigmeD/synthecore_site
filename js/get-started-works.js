/* SyntheCore /get-started/ v4.5 — standalone, click-driven carousel.
 * Reuses the case-detail markup/cards and infinite clone pattern, but animates
 * the track itself so the motion is independent of scroll-snap, Lenis and
 * browser smooth-scroll implementations (including file:// previews).
 */
(() => {
  'use strict';
  const viewport = document.getElementById('relatedViewport');
  const track = viewport?.querySelector('.related-work__track');
  if (!viewport || !track || viewport.dataset.carouselReady === 'true') return;
  const originals = [...track.querySelectorAll(':scope > .case-card')];
  const count = originals.length;
  if (count < 2) return;

  const edge = Math.min(3, count);
  const before = originals.slice(-edge).map(card => card.cloneNode(true));
  const after = originals.slice(0, edge).map(card => card.cloneNode(true));
  [...before, ...after].forEach(card => {
    card.dataset.carouselClone = 'true';
    card.setAttribute('aria-hidden', 'true');
    card.querySelectorAll('a,button,input,select,textarea,[tabindex]').forEach(el => { el.tabIndex = -1; });
  });
  before.reverse().forEach(card => track.prepend(card));
  after.forEach(card => track.append(card));
  const all = [...track.querySelectorAll(':scope > .case-card')];
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const duration = 560;
  const motion = `transform ${duration}ms cubic-bezier(.22,.8,.2,1)`;
  let index = edge;
  let animating = false;
  let queue = [];
  let endTimer = null;

  const xFor = at => all[at]?.offsetLeft ?? 0;
  const position = (animate) => {
    track.style.transition = animate && !reduced.matches ? motion : 'none';
    track.style.transform = `translate3d(${-xFor(index)}px,0,0)`;
  };
  const settle = () => {
    clearTimeout(endTimer);
    if (!animating) return;
    animating = false;
    if (index < edge) index += count;
    if (index >= edge + count) index -= count;
    position(false);
    // Re-enable the transition only after the instantaneous clone-to-real jump.
    void track.offsetWidth;
    if (queue.length) {
      const step = queue.shift();
      requestAnimationFrame(() => advance(step));
    }
  };
  const advance = (step) => {
    if (animating) { queue.push(step); return; }
    if (!step) return;
    index += step;
    if (reduced.matches) {
      if (index < edge) index += count;
      if (index >= edge + count) index -= count;
      position(false);
      return;
    }
    animating = true;
    position(true);
    endTimer = setTimeout(settle, duration + 90);
  };

  track.addEventListener('transitionend', event => {
    if (event.target === track && event.propertyName === 'transform') settle();
  });
  viewport.parentElement.querySelectorAll('.related-work__arrow').forEach(button => {
    button.addEventListener('click', () => advance(Number(button.dataset.direction)));
  });
  viewport.addEventListener('keydown', event => {
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      event.preventDefault();
      advance(event.key === 'ArrowRight' ? 1 : -1);
    }
  });

  track.addEventListener('focusin',event=>{
    const card=event.target.closest('.case-card');
    const focused=all.indexOf(card);
    if(focused<edge||focused>=edge+count)return;
    const left=xFor(focused),visibleLeft=xFor(index);
    if(animating||left<visibleLeft||left+card.offsetWidth>visibleLeft+viewport.clientWidth+1){
      clearTimeout(endTimer);
      animating=false;
      queue=[];
      index=focused;
      position(false);
    }
    // Keyboard focus can natively scroll even an overflow:hidden viewport.
    // Keep all navigation on the same transform-based track.
    viewport.scrollLeft=0;
  });
  viewport.addEventListener('scroll',()=>{
    if(viewport.scrollLeft!==0)viewport.scrollLeft=0;
  },{passive:true});

  let touchX = null;
  viewport.addEventListener('touchstart', event => {
    if (event.touches.length === 1) touchX = event.touches[0].clientX;
  }, {passive:true});
  viewport.addEventListener('touchend', event => {
    if (touchX === null || !event.changedTouches.length) return;
    const delta = event.changedTouches[0].clientX - touchX;
    touchX = null;
    if (Math.abs(delta) > 42) advance(delta < 0 ? 1 : -1);
  }, {passive:true});

  let resizeFrame = null;
  const updateGeometry = () => {
    if (resizeFrame !== null) cancelAnimationFrame(resizeFrame);
    resizeFrame = requestAnimationFrame(() => {
      resizeFrame = null;
      // A width change must not leave us halfway between positions.
      if (animating) { clearTimeout(endTimer); animating = false; queue = []; }
      if (index < edge) index += count;
      if (index >= edge + count) index -= count;
      position(false);
    });
  };
  if ('ResizeObserver' in window) new ResizeObserver(updateGeometry).observe(viewport);
  else window.addEventListener('resize', updateGeometry);
  if (document.fonts?.ready) document.fonts.ready.then(updateGeometry);
  viewport.dataset.carouselReady = 'true';
  viewport.scrollLeft = 0;
  position(false);
})();
