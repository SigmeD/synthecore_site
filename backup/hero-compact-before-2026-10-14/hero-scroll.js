/* One owner of scrolling: Lenis -> GSAP ticker -> ScrollTrigger timeline. */
document.addEventListener('DOMContentLoaded', async () => {
  const sticky = document.getElementById('imageScrollSticky');
  const hero = sticky.querySelector('.hero');
  const photo = hero.querySelector('.photo');
  const image = photo.querySelector('img');
  const caption = photo.querySelector('.photo-caption');
  const home = photo.parentNode;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const compact = matchMedia('(max-width:850px), (min-aspect-ratio:3/1)');
  const mouse = matchMedia('(hover: hover) and (pointer: fine)');
  const textGroups = [...hero.querySelectorAll('.hero-head,.side-left,.side-right,.hero-bottom')];
  const edgeText = [...hero.querySelectorAll('h1,h1 > span,.side-index,.side-left p,.side-small,.side-right p,.capabilities > span,.scroll-next')];
  const originalStyles = new Map([hero, photo, image, caption, ...textGroups, ...edgeText].map(node => [node, node.getAttribute('style')]));
  // Lenis already smooths physical scroll. A second time-based scrub would let
  // the reveal lag behind pin release, especially on a fast boundary crossing.
  const settings = { duration: 1.2, scrub: true, pinViewportRatio: 1.1 };
  let timeline = null, context = null, lenis = null, holder = null;
  let geometry = null, engine = 'initializing', ready = false;
  let textCoverage = [], pendingAnchor = null;
  let edgeTextBoxes = [];
  const toneState = { progress: 0 };
  const gsap = window.gsap, ScrollTrigger = window.ScrollTrigger;
  const available = Boolean(gsap && ScrollTrigger && window.SyntheCoreHeroGeometry);
  let gateState = 'DISABLED', settleToken = 0, navigationBypass = false;
  let lastWheelTime = -Infinity, lastWheelDelta = 0, risingEvents = 0, risingDistance = 0;
  let smallTicks = 0, smallTickDelta = 0;
  let blockedWheels = 0, gestureReason = 'initial';
  const boundary = () => timeline?.scrollTrigger?.end ?? 0;

  function bypassGate(reason) {
    ++settleToken;
    navigationBypass = true;
    if (lenis) gateState = 'LEAVING';
    gestureReason = reason;
    risingEvents = risingDistance = 0;
  }
  function scrollUpdated() {
    ScrollTrigger.update();
    if (navigationBypass || gateState === 'SETTLING') return;
    if (gateState === 'READY' && Math.abs(window.scrollY - boundary()) <= 1) return;
    if (gateState === 'LEAVING' && lenis.targetScroll > boundary() && window.scrollY >= boundary() - 1) return;
    gateState = window.scrollY > boundary() + 1 ? 'LEAVING' : 'EXPANDING';
  }
  function settleBoundary() {
    const token = ++settleToken;
    gateState = 'SETTLING';
    risingEvents = risingDistance = 0;
    // programmatic:false sets targetScroll immediately; the existing Lenis
    // easing still finishes the reveal. No second scrub, stop(), snap or timer.
    lenis.scrollTo(boundary(), {
      programmatic: false, duration: settings.duration, easing: lenis.options.easing, lerp: 0,
      onComplete: () => {
      if (token !== settleToken || gateState !== 'SETTLING') return;
      ScrollTrigger.update();
      gateState = 'READY';
      smallTicks = smallTickDelta = 0;
      },
    });
  }
  function filterWheel({ deltaX, deltaY, event }) {
    if (!lenis || !timeline || event.type !== 'wheel' || event.ctrlKey || event.metaKey ||
        deltaY === 0 || Math.abs(deltaX) > Math.abs(deltaY)) return true;
    // Match Lenis opt-outs: nested native scrollers must never fill this gate.
    if (event.composedPath().some(node => node instanceof Element &&
        (node.hasAttribute('data-lenis-prevent') || node.hasAttribute('data-lenis-prevent-wheel') ||
         node.matches('input,textarea,select,[contenteditable]')))) return true;
    if (navigationBypass) {
      navigationBypass = false;
      gateState = window.scrollY > boundary() + 1 ? 'LEAVING' : 'EXPANDING';
    }
    const now = performance.now(), gap = now - lastWheelTime;
    const delta = Math.abs(deltaY);
    const quiet = gap > 180;
    if (quiet) { risingEvents = 0; risingDistance = delta; }
    else if (deltaY > 0 && lastWheelDelta > 0 && delta > lastWheelDelta * 1.35) {
      ++risingEvents;
      risingDistance += delta;
    } else { risingEvents = 0; risingDistance = delta; }
    lastWheelTime = now;
    lastWheelDelta = deltaY > 0 ? delta : -delta;
    if (deltaY < 0) {
      ++settleToken;
      if (gateState === 'SETTLING') lenis.scrollTo(window.scrollY, { immediate: true, force: true });
      gateState = 'EXPANDING';
      gestureReason = 'reverse';
      return true;
    }
    if (gateState === 'LEAVING' && window.scrollY <= boundary() - 1) gateState = 'EXPANDING';
    if (gateState === 'READY') {
      // WheelEvent has no cross-platform momentum phase. Require either a
      // separate substantial wheel tick or renewed precision-input acceleration.
      // A quiet interval alone, or the next decaying event, never unlocks READY.
      const discrete = quiet && (delta >= 40 || event.deltaMode === 1);
      const accelerated = risingEvents >= 2 && delta >= 8 && risingDistance >= 16;
      // Low wheel-sensitivity settings may emit <40px per deliberate tick.
      // Two separated, non-decaying ticks also qualify; continuous tails do not.
      if (quiet && delta >= 4) {
        smallTicks = smallTicks && delta >= smallTickDelta ? smallTicks + 1 : 1;
        smallTickDelta = delta;
      } else smallTicks = smallTickDelta = 0;
      const repeatedTicks = smallTicks >= 2;
      if (discrete || accelerated || repeatedTicks) {
        gateState = 'LEAVING';
        gestureReason = discrete ? 'separate-wheel' : accelerated ? 'renewed-acceleration' : 'separate-small-ticks';
        return true;
      }
    } else if (gateState === 'EXPANDING') {
      if (lenis.targetScroll + deltaY < boundary()) return true;
      gestureReason = 'reveal-boundary';
      settleBoundary();
    } else if (gateState !== 'SETTLING') return true;
    // virtualScroll:false runs BEFORE Lenis preventDefault. Consume explicitly
    // here so the browser cannot scroll natively through a rejected tail event.
    if (event.cancelable) event.preventDefault();
    ++blockedWheels;
    return false;
  }

  function tick(time) {
    // Native touch or middle-click can cancel Lenis without onComplete. Such an
    // interruption must leave SETTLING; otherwise every next wheel is consumed.
    if (lenis && gateState === 'SETTLING' && lenis.isScrolling !== 'smooth') {
      bypassGate('native-interruption');
    }
    // Lenis ignores native scroll events while its animation is running.
    // Observe external physical movement before the same ticker advances it;
    // scrollbar/native navigation must not be pulled back into the checkpoint.
    if (lenis?.isScrolling === 'smooth' && !navigationBypass &&
        ['EXPANDING', 'SETTLING', 'READY'].includes(gateState) &&
        Math.abs(window.scrollY - lenis.animatedScroll) > 2) {
      bypassGate('native-scroll');
      lenis.scrollTo(window.scrollY, { immediate: true, force: true });
    }
    lenis?.raf(time * 1000);
  }
  function resizeLenis() {
    if (!lenis) return;
    const occupied = gateState, previousTarget = lenis.targetScroll;
    lenis.resize();
    if (occupied === 'READY') {
      gateState = 'READY';
      lenis.scrollTo(boundary(), { immediate: true, force: true });
    } else if (occupied === 'SETTLING') settleBoundary();
    else if (occupied === 'EXPANDING' && !navigationBypass && previousTarget >= boundary()) {
      // A viewport shrink can move the end in front of an existing wheel target.
      // Reconcile that pending gesture before its old animation can cross it.
      if (window.scrollY >= boundary()) {
        ++settleToken;
        gateState = 'READY';
        lenis.scrollTo(boundary(), { immediate: true, force: true });
      } else settleBoundary();
    }
  }
  function refresh() {
    if (available) ScrollTrigger.refresh();
    resizeLenis();
  }

  function focusAnchor() {
    if (!pendingAnchor) return;
    const target = pendingAnchor;
    pendingAnchor = null;
    if (document.activeElement === target) return;
    const previous = target.getAttribute('tabindex');
    if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
    target.addEventListener('blur', () => {
      if (previous === null) target.removeAttribute('tabindex');
      else target.setAttribute('tabindex', previous);
    }, { once: true });
  }
  function anchorClick(event) {
    if (!lenis || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = event.target.closest?.('a[href]');
    if (!link || link.hasAttribute('download') || (link.target && link.target !== '_self')) return;
    const targetUrl = new URL(link.href);
    if (targetUrl.origin !== location.origin || targetUrl.pathname !== location.pathname || targetUrl.search !== location.search || !targetUrl.hash) return;
    let target;
    try { target = document.getElementById(decodeURIComponent(targetUrl.hash.slice(1))); }
    catch { return; }
    if (!target) return;
    // Navigation delegates to the same Lenis instance, with one filtered owner.
    event.preventDefault();
    bypassGate('anchor');
    pendingAnchor = target;
    if (location.hash !== targetUrl.hash) history.pushState(null, '', targetUrl.hash);
    lenis.scrollTo(target, { onComplete: focusAnchor });
  }
  function keyboardScroll(event) {
    if (!lenis || event.defaultPrevented || !['ArrowDown','ArrowUp','PageDown','PageUp','Home','End',' '].includes(event.key)) return;
    if (event.target.closest?.('input,textarea,select,[contenteditable],button')) return;
    pendingAnchor = null;
    bypassGate('keyboard');
    // End wheel inertia, then let the browser handle the original key normally.
    lenis.scrollTo(window.scrollY, { immediate: true, force: true });
  }

  window.__synthecoreScrollQA = {
    getEngine: () => engine,
    getProgress: () => timeline?.progress() ?? 0,
    getScrollProgress: () => timeline?.scrollTrigger?.progress ?? 0,
    getPinDistance: () => timeline ? timeline.scrollTrigger.end - timeline.scrollTrigger.start : 0,
    photoMounted: () => Boolean(holder?.isConnected),
    refresh,
    getState: () => ({
      engine, ready, timelineProgress: timeline?.progress() ?? 0,
      scrollProgress: timeline?.scrollTrigger?.progress ?? 0,
      pinActive: timeline?.scrollTrigger?.isActive ?? false,
      pinStart: timeline?.scrollTrigger?.start ?? 0,
      pinEnd: timeline?.scrollTrigger?.end ?? 0,
      gateState, blockedWheels, gestureReason, navigationBypass,
      lastWheelDelta, risingEvents,
      smoothWheel: Boolean(lenis), duration: lenis?.options.duration ?? 0,
      lerp: lenis?.options.lerp ?? 0, scrub: timeline ? settings.scrub : 0,
      scroll: window.scrollY, targetScroll: lenis?.targetScroll ?? window.scrollY,
      velocity: lenis?.velocity ?? 0,
    }),
  };

  function teardown() {
    // Stop the only inertia owner before removing the pin spacer.
    if (lenis) {
      gsap.ticker.remove(tick);
      lenis.off('scroll', scrollUpdated);
      lenis.destroy();
      lenis = null;
    }
    context?.revert();
    context = null;
    timeline = null;
    ++settleToken;
    gateState = 'DISABLED';
    navigationBypass = false;
    lastWheelTime = -Infinity;
    lastWheelDelta = risingEvents = risingDistance = blockedWheels = 0;
    smallTicks = smallTickDelta = 0;
    if (holder) {
      holder.replaceWith(photo);
      holder = null;
    }
    photo.classList.remove('hero-image-expander');
    sticky.classList.remove('is-image-animated');
    for (const [node, style] of originalStyles) {
      if (style === null) node.removeAttribute('style');
      else node.setAttribute('style', style);
    }
    geometry = null;
    textCoverage = [];
    edgeTextBoxes = [];
    toneState.progress = 0;
    pendingAnchor = null;
  }

  function measure() {
    const panel = hero.getBoundingClientRect();
    const frame = holder.getBoundingClientRect();
    const frameStyle = getComputedStyle(holder);
    const imageStyle = getComputedStyle(image);
    const positions = imageStyle.objectPosition.split(' ');
    const percent = (value, fallback) => value?.endsWith('%') ? parseFloat(value) / 100 : fallback;
    const panelBox = { width: panel.width, height: panel.height, radius: parseFloat(getComputedStyle(hero).borderTopLeftRadius) || 30 };
    const frameBox = { x: frame.left - panel.left, y: frame.top - panel.top, width: frame.width, height: frame.height,
      radius: parseFloat(frameStyle.borderTopLeftRadius) || 24 };
    geometry = window.SyntheCoreHeroGeometry.createGeometry(
      panelBox, frameBox,
      { width: image.naturalWidth, height: image.naturalHeight },
      { x: percent(positions[0], .53), y: percent(positions[1], .55) },
    );
    if (!geometry) return false;
    geometry.frame = frameBox;
    geometry.hero = panelBox;
    edgeTextBoxes = edgeText.map(node => {
      const box = node.getBoundingClientRect();
      const accent = node.matches('h1 > span');
      const secondary = node.matches('.side-index,.capabilities > span,.scroll-next');
      const dark = accent ? [228,77,31] : node.matches('.side-small') ? [98,116,133] : secondary ? [82,108,130] : [23,30,35];
      const light = accent ? [246,127,86] : node.matches('.side-small') ? [203,214,223] : secondary ? [220,229,237] : [245,249,252];
      return { node, x: box.left - panel.left, y: box.top - panel.top, width: box.width, height: box.height,
        dark: `rgb(${dark})`, light: `rgb(${light})` };
    });
    textCoverage = textGroups.map(node => {
      // A full-width wrapper can be wider than its centered or wrapped text.
      // Measure actual line fragments, so text changes as soon as it is covered.
      const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
      const fragments = [];
      while (walker.nextNode()) {
        if (!walker.currentNode.textContent.trim()) continue;
        const range = document.createRange();
        range.selectNodeContents(walker.currentNode);
        fragments.push(...[...range.getClientRects()].filter(rect => rect.width && rect.height));
      }
      const box = fragments.length ? {
        left: Math.min(...fragments.map(rect => rect.left)),
        top: Math.min(...fragments.map(rect => rect.top)),
        right: Math.max(...fragments.map(rect => rect.right)),
        bottom: Math.max(...fragments.map(rect => rect.bottom)),
      } : node.getBoundingClientRect();
      return window.SyntheCoreHeroGeometry.coverageProgress(panelBox, frameBox,
        { x: box.left - panel.left, y: box.top - panel.top, width: box.right - box.left, height: box.bottom - box.top });
    });
    // Layout writes occur only during setup/refresh. Frames animate mask/transforms.
    photo.style.width = `${panel.width}px`;
    photo.style.height = `${panel.height}px`;
    image.style.width = `${geometry.image.width}px`;
    image.style.height = `${geometry.image.height}px`;
    caption.style.left = `${frame.left - panel.left + 17}px`;
    caption.style.bottom = `${panel.bottom - frame.bottom + 16}px`;
    return true;
  }

  function renderTones() {
    const mix = (from, to, t) => from.map((value, i) => Math.round(value + (to[i] - value) * t)).join(',');
    textGroups.forEach((node, index) => {
      // Complete the short colour fade as the last glyph enters the mask.
      // Waiting for full wrapper coverage kept whole words dark over the photo.
      const duration = Math.min(.08, textCoverage[index]);
      const start = Math.max(0, textCoverage[index] - duration);
      const progress = Math.max(0, Math.min(1, (toneState.progress - start) / Math.max(.001, duration)));
      const tone = progress * progress * (3 - 2 * progress);
      node.style.setProperty('--hero-strong', mix([23,30,35], [245,249,252], tone));
      node.style.setProperty('--hero-secondary', mix([82,108,130], [220,229,237], tone));
      node.style.setProperty('--hero-soft', mix([98,116,133], [203,214,223], tone));
      node.style.setProperty('--hero-line', mix([168,186,201], [213,224,232], tone));
      node.style.setProperty('--hero-shadow-alpha', String(.015 + tone * .45));
      node.style.setProperty('--hero-accent', `rgb(${mix([228,77,31], [246,127,86], tone)})`);
    });
    // Colour actual glyphs in two dimensions across the current rectangular
    // photo mask, including partial heading lines and the bottom capabilities.
    // Existing elements retain their own background boxes and line breaks;
    // no text clones or wrappers change layout or the accessibility tree.
    const progress = toneState.progress;
    const left = geometry.frame.x * (1 - progress);
    const right = geometry.hero.width - (geometry.hero.width - geometry.frame.x - geometry.frame.width) * (1 - progress);
    const top = geometry.frame.y * (1 - progress);
    const bottom = geometry.hero.height - (geometry.hero.height - geometry.frame.y - geometry.frame.height) * (1 - progress);
    for (const { node, x, y, width, height, dark, light } of edgeTextBoxes) {
      const l = left - x, r = right - x;
      const t = top - y, b = bottom - y;
      const outside = r <= 0 || l >= width || b <= 0 || t >= height;
      const inside = l <= -2 && r >= width + 2 && t <= -2 && b >= height + 2;
      if (outside || inside) {
        node.style.removeProperty('background-image');
        node.style.removeProperty('background-clip');
        node.style.removeProperty('-webkit-background-clip');
        node.style.removeProperty('text-shadow');
        node.style.color = outside ? dark : light;
        if (inside) node.style.textShadow = '0 1px 2px rgba(8,15,22,.40), 0 2px 14px rgba(8,15,22,.25)';
      } else {
        node.style.backgroundImage = `linear-gradient(180deg, ${dark} ${t - 2}px, transparent ${t + 2}px, transparent ${b - 2}px, ${dark} ${b + 2}px), linear-gradient(90deg, ${dark} ${l - 2}px, ${light} ${l + 2}px, ${light} ${r - 2}px, ${dark} ${r + 2}px)`;
        node.style.backgroundClip = 'text';
        node.style.webkitBackgroundClip = 'text';
        node.style.color = 'transparent';
        // A shadow on transparent gradient glyphs paints over their background
        // fill in Chromium. Use the photo scrim for contrast while clipped.
        node.style.textShadow = 'none';
      }
    }
  }

  function rebuild() {
    if (!ready) return;
    teardown();
    if (reduced.matches) { engine = 'native-reduced-motion'; return; }
    if (compact.matches || !mouse.matches) { engine = 'native-mobile'; return; }
    if (!available) { engine = 'native-missing-dependencies'; return; }
    if (!image.naturalWidth) { engine = 'native-missing-image'; return; }

    holder = document.createElement('div');
    holder.className = 'photo photo-position-holder';
    holder.setAttribute('aria-hidden', 'true');
    home.replaceChild(holder, photo);
    photo.classList.add('hero-image-expander');
    hero.appendChild(photo);
    sticky.classList.add('is-image-animated');
    if (!measure()) { teardown(); engine = 'native-unmeasured'; return; }

    try {
      context = gsap.context(() => {
        timeline = gsap.timeline({
          defaults: { ease: 'none' },
          scrollTrigger: {
            id: 'synthecore-hero', trigger: sticky, pin: true, pinSpacing: true,
            start: 'top top', end: () => `+=${Math.round(innerHeight * settings.pinViewportRatio)}`,
            scrub: settings.scrub, anticipatePin: 1, invalidateOnRefresh: true,
            onRefresh: self => {
              // The pin now has its new width. refreshInit still has the old one.
              if (!measure()) return;
              const animation = self.animation;
              if (animation) {
                const progress = animation.totalProgress();
                animation.invalidate().totalProgress(progress);
              }
              renderTones();
            },
          },
        });
        timeline
          .fromTo(photo, { clipPath: () => geometry.startMask }, { clipPath: () => geometry.endMask, duration: 1 }, 0)
          .fromTo(image, {
            x: () => geometry.start.x, y: () => geometry.start.y,
            scaleX: () => geometry.start.scale, scaleY: () => geometry.start.scale,
          }, { x: () => geometry.end.x, y: () => geometry.end.y, scaleX: 1, scaleY: 1, duration: 1 }, 0)
          .fromTo(holder, { opacity: 1 }, { opacity: 0, duration: .18 }, 0)
          .fromTo(photo, { '--photo-shade-opacity': 0 }, { '--photo-shade-opacity': .98, duration: .22, ease: 'sine.inOut' }, .08)
          .fromTo(photo, { '--photo-caption-opacity': 1 }, { '--photo-caption-opacity': 0, duration: .30 }, .34)
          .fromTo(toneState, { progress: 0 }, { progress: 1, duration: 1, onUpdate: renderTones }, 0);

      }, hero);

      if (window.Lenis) {
        lenis = new window.Lenis({
          duration: settings.duration, lerp: 0, smoothWheel: true,
          // Built-in anchors also process modified/new-tab links. Our filtered
          // handler above delegates to scrollTo and preserves hash/focus safely.
          syncTouch: false, anchors: false, autoRaf: false,
          virtualScroll: filterWheel,
        });
        gateState = 'EXPANDING';
        lenis.on('scroll', scrollUpdated);
        gsap.ticker.add(tick);
        gsap.ticker.lagSmoothing(0);
        engine = 'lenis-gsap-scrolltrigger';
      } else engine = 'gsap-scrolltrigger';
      refresh();
    } catch (error) {
      teardown();
      engine = 'native-initialization-error';
      console.warn('SyntheCore: smooth scrolling unavailable; keeping native scrolling.', error);
    }
  }

  if (available) {
    gsap.registerPlugin(ScrollTrigger);
    ScrollTrigger.addEventListener('refresh', resizeLenis);
  }
  reduced.addEventListener('change', rebuild);
  compact.addEventListener('change', rebuild);
  mouse.addEventListener('change', rebuild);
  window.addEventListener('orientationchange', refresh);
  window.addEventListener('pageshow', refresh);
  document.addEventListener('click', anchorClick, { capture: true });
  document.addEventListener('keydown', keyboardScroll);
  window.addEventListener('popstate', () => {
    pendingAnchor = null;
    bypassGate('history');
    // Native history restoration follows this event; let Lenis observe it.
    if (lenis) { lenis.stop(); lenis.start(); }
  });

  // Keep the original photo visible until its intrinsic dimensions are ready.
  await Promise.all([
    document.fonts?.ready ?? Promise.resolve(),
    image.decode ? image.decode().catch(() => {}) : Promise.resolve(),
  ]);
  ready = true;
  rebuild();
  if (location.hash) {
    let target;
    try { target = document.getElementById(decodeURIComponent(location.hash.slice(1))); } catch {}
    if (target) {
      if (lenis) { bypassGate('initial-anchor'); lenis.scrollTo(target, { immediate: true, force: true }); }
      else target.scrollIntoView({ behavior: 'instant', block: 'start' });
    }
  }
}, { once: true });
