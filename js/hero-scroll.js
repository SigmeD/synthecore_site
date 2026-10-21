/* One owner of scrolling: Lenis -> GSAP ticker -> ScrollTrigger timeline. */
document.addEventListener('DOMContentLoaded', async () => {
  const sticky = document.getElementById('imageScrollSticky');
  const hero = sticky.querySelector('.hero');
  const photo = hero.querySelector('.photo');
  const image = photo.querySelector('img');
  const caption = photo.querySelector('.photo-caption');
  const home = photo.parentNode;
  const audienceSection = document.getElementById('audiences');
  const audienceCopy = audienceSection.querySelector('.audience-copy');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const compact = matchMedia('(max-width:850px), (min-aspect-ratio:3/1)');
  const mouse = matchMedia('(hover: hover) and (pointer: fine)');
  const textGroups = [...hero.querySelectorAll('.hero-head,.side-left,.side-right,.hero-bottom')];
  const edgeText = [...hero.querySelectorAll('h1,h1 > span,.side-index,.side-left p,.side-small,.side-right p,.capabilities > span,.scroll-next')];
  const originalStyles = new Map([hero, photo, image, caption, ...textGroups, ...edgeText].map(node => [node, node.getAttribute('style')]));
  // Preserve Works_v8 geometry; live Roveia media uses .5 of a .6 timeline.
  // Lenis smooths scroll once; reveal follows it exactly through pin release.
  const settings = Object.freeze({
    // Interpolate scroll distance at a constant rate; unlike an ease-out duration,
    // repeated high-velocity wheel events cannot restart the curve abruptly.
    lerp: 0.068, wheelMultiplier: 1, touchMultiplier: 1.5,
    // Only unusually large wheel bursts are limited. Trackpad and ordinary
    // 80-140px wheel events retain their native distances; extreme bursts
    // are compressed rather than hard-capped.
    wheelSoftLimit: 320, wheelCompression: 0.6,
    scrub: true, pinViewportRatio: 1.1,
    revealPortion: 1,
    audienceOffsetMin: 80,
    audienceOffsetMax: 140,
    audienceOffsetViewportFraction: 0.1,
    audienceTravelViewportFraction: 0.7,
    audienceScrub: true
  });
  let timeline = null, parallax = null, context = null, lenis = null, holder = null;
  let geometry = null, engine = 'initializing', ready = false;
  let textCoverage = [], pendingAnchor = null;
  let edgeTextBoxes = [];
  const toneState = { progress: 0 };
  const gsap = window.gsap, ScrollTrigger = window.ScrollTrigger;
  const available = Boolean(gsap && ScrollTrigger && window.SyntheCoreHeroGeometry);
  const boundary = () => timeline?.scrollTrigger?.end ?? 0;

  function scrollUpdated() {
    ScrollTrigger.update();
  }
  function tick(time) {
    // One clock and one scroll owner. Never force an immediate jump here:
    // window.scrollY can change briefly as ScrollTrigger inserts/removes pins.
    lenis?.raf(time * 1000);
  }
  function resizeLenis() {
    if (!lenis) return;
    const target = lenis.targetScroll, scrolling = lenis.isScrolling === 'smooth';
    lenis.resize();
    // resize() resets the target to actualScroll while inertia still runs.
    // Retain its destination so the next downward wheel cannot aim backwards.
    if (scrolling) lenis.targetScroll = Math.max(0, Math.min(lenis.limit, target));
  }
  // A pin refresh changes spacer heights synchronously. Performing it while
  // Lenis is still interpolating is one cause of a visible boundary snap.
  // Geometry updates from all sections share this single idle-aware queue.
  let refreshFrame = 0;
  let refreshTimer = 0;
  function requestRefresh({immediate = false} = {}) {
    if (!available) return;
    if (refreshFrame) cancelAnimationFrame(refreshFrame);
    refreshFrame = requestAnimationFrame(() => {
      refreshFrame = 0;
      if (!immediate && lenis && lenis.isScrolling === 'smooth') {
        if (refreshTimer) clearTimeout(refreshTimer);
        refreshTimer = setTimeout(() => {
          refreshTimer = 0;
          requestRefresh();
        }, 150);
        return;
      }
      if (refreshTimer) { clearTimeout(refreshTimer); refreshTimer = 0; }
      ScrollTrigger.refresh();
    });
  }
  function refresh() { requestRefresh(); }
  function syncLenis() {
    const canSmooth = !reduced.matches && available && Boolean(window.Lenis);
    if (!canSmooth) {
      if (lenis) {
        gsap.ticker.remove(tick);
        lenis.off('scroll', scrollUpdated);
        lenis.destroy();
        lenis = null;
      }
      return;
    }
    if (lenis) return;
    // Roveia uses a single global Lenis (duration 1.2), including outside
    // pinned areas. A lerp-based response produces a softer impulse and
    // remains continuous when wheel input accelerates or changes direction.
    lenis = new window.Lenis({
      lerp: settings.lerp,
      smoothWheel: true,
      wheelMultiplier: settings.wheelMultiplier,
      touchMultiplier: settings.touchMultiplier,
      syncTouch: false,
      // Smooth the approach to independently pinned sections without
      // imposing a second scrub lag on their animations.
      virtualScroll: input => {
        if (Math.abs(input.deltaY) > settings.wheelSoftLimit) {
          const excess = (Math.abs(input.deltaY) - settings.wheelSoftLimit) / settings.wheelSoftLimit;
          input.deltaY = Math.sign(input.deltaY) * settings.wheelSoftLimit
            * (1 + settings.wheelCompression * Math.log1p(excess));
        }
      },
      anchors: false,
      autoRaf: false
    });
    lenis.on('scroll', scrollUpdated);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
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
    pendingAnchor = target;
    if (location.hash !== targetUrl.hash) history.pushState(null, '', targetUrl.hash);
    lenis.scrollTo(target, { onComplete: focusAnchor });
  }
  function keyboardScroll(event) {
    if (!lenis || event.defaultPrevented || !['ArrowDown','ArrowUp','PageDown','PageUp','Home','End',' '].includes(event.key)) return;
    if (event.target.closest?.('input,textarea,select,[contenteditable],button')) return;
    pendingAnchor = null;
    // End wheel inertia, then let the browser handle the original key normally.
    lenis.scrollTo(window.scrollY, { immediate: true, force: true });
  }

  // Shared scroll navigation for pinned components. No second Lenis and
  // no browser smooth-scroll competing with the active Lenis target.
  window.SyntheCoreMotion = Object.freeze({
    requestRefresh,
    getScrollState: () => ({
      owner: lenis ? 'lenis' : 'native',
      isScrolling: lenis?.isScrolling ?? false,
      target: lenis?.targetScroll ?? window.scrollY,
      animated: lenis?.animatedScroll ?? window.scrollY,
      velocity: lenis?.velocity ?? 0,
      lerp: lenis?.options.lerp ?? 0,
      wheelSoftLimit: settings.wheelSoftLimit,
      remaining: Math.abs((lenis?.targetScroll ?? window.scrollY) - window.scrollY)
    }),
    scrollTo(top, {immediate=false}={}) {
      if (lenis && !reduced.matches) lenis.scrollTo(top, {immediate,force:true});
      else window.scrollTo({top,behavior:immediate||reduced.matches?'instant':'smooth'});
    }
  });

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
      parallaxStart: parallax?.scrollTrigger?.start ?? 0,
      parallaxEnd: parallax?.scrollTrigger?.end ?? 0,
      parallaxProgress: parallax?.progress() ?? 0,
      parallaxScrub: parallax?.scrollTrigger?.vars.scrub ?? 0,
      // Diagnostic phase only: no state blocks or consumes wheel input.
      gateState: !lenis ? 'DISABLED' : window.scrollY > boundary() + 1 ? 'LEAVING'
        : Math.abs(window.scrollY - boundary()) <= 1 && timeline?.progress() >= .999999 ? 'READY' : 'EXPANDING',
      blockedWheels: 0,
      smoothWheel: Boolean(lenis), duration: lenis?.options.duration ?? 0,
      lerp: lenis?.options.lerp ?? 0, scrub: timeline ? settings.scrub : 0,
      scroll: window.scrollY, targetScroll: lenis?.targetScroll ?? window.scrollY,
      velocity: lenis?.velocity ?? 0,
    }),
  };

  function teardown() {
    // Lenis survives Hero's pin lifecycle and responsive changes. Only the
    // explicit reduced-motion preference may disable global smooth scrolling.
    context?.revert();
    context = null;
    timeline = null;
    parallax = null;
    if (holder) {
      holder.replaceWith(photo);
      holder = null;
    }
    photo.classList.remove('hero-image-expander');
    sticky.classList.remove('is-image-animated');
    sticky.classList.remove('sc-sticky-pin');
    document.getElementById('top').classList.remove('sc-sticky-pin-container');
    document.getElementById('top').style.removeProperty('--sc-hero-stage-height');
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
    const progress = Math.min(1, toneState.progress / settings.revealPortion);
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
    if (refreshFrame) { cancelAnimationFrame(refreshFrame); refreshFrame = 0; }
    if (refreshTimer) { clearTimeout(refreshTimer); refreshTimer = 0; }
    teardown();
    syncLenis();
    if (reduced.matches) { engine = 'native-reduced-motion'; return; }
    if (compact.matches || !mouse.matches) { engine = lenis ? 'lenis-compact' : 'native-mobile'; return; }
    if (!available) { engine = 'native-missing-dependencies'; return; }
    if (!image.naturalWidth) { engine = 'native-missing-image'; return; }

    holder = document.createElement('div');
    holder.className = 'photo photo-position-holder';
    holder.setAttribute('aria-hidden', 'true');
    home.replaceChild(holder, photo);
    photo.classList.add('hero-image-expander');
    hero.appendChild(photo);
    sticky.classList.add('is-image-animated');
    sticky.classList.add('sc-sticky-pin');
    document.getElementById('top').style.setProperty('--sc-hero-stage-height', `${Math.ceil(sticky.getBoundingClientRect().height)}px`);
    document.getElementById('top').classList.add('sc-sticky-pin-container');
    if (!measure()) { teardown(); engine = 'native-unmeasured'; return; }

    try {
      context = gsap.context(() => {
        timeline = gsap.timeline({
          defaults: { ease: 'none' },
          scrollTrigger: {
            id: 'synthecore-hero', trigger: sticky, // CSS sticky holds stage without GSAP pin-spacer
            start: 'top top', end: () => `+=${Math.round(innerHeight * settings.pinViewportRatio)}`,
            scrub: settings.scrub, invalidateOnRefresh: true,
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
          .fromTo(photo, { clipPath: () => geometry.startMask }, { clipPath: () => geometry.endMask, duration: settings.revealPortion }, 0)
          .fromTo(image, {
            x: () => geometry.start.x, y: () => geometry.start.y,
            scaleX: () => geometry.start.scale, scaleY: () => geometry.start.scale,
          }, { x: () => geometry.end.x, y: () => geometry.end.y, scaleX: 1, scaleY: 1, duration: settings.revealPortion }, 0)
          .fromTo(holder, { opacity: 1 }, { opacity: 0, duration: .18 }, 0)
          .fromTo(photo, { '--photo-shade-opacity': 0 }, { '--photo-shade-opacity': .98, duration: .22, ease: 'sine.inOut' }, .08)
          .fromTo(photo, { '--photo-caption-opacity': 1 }, { '--photo-caption-opacity': 0, duration: .30 }, .34)
          .fromTo(toneState, { progress: 0 }, { progress: 1, duration: 1, onUpdate: renderTones }, 0);

        // Only the inner copy receives extra motion. Its section remains in
        // normal flow; this range starts at the unchanged Hero pin end.
        const audienceOffset = () => Math.min(settings.audienceOffsetMax,
          Math.max(settings.audienceOffsetMin,innerHeight*settings.audienceOffsetViewportFraction));
        const audienceRange = () => Math.round(innerHeight*settings.audienceTravelViewportFraction);
        parallax = gsap.timeline({
          defaults: { ease: 'none' },
          scrollTrigger: {
              id: 'synthecore-audience-parallax', trigger: audienceSection,
              start: () => timeline.scrollTrigger.end,
              end: () => timeline.scrollTrigger.end + audienceRange(),
              scrub: settings.audienceScrub, invalidateOnRefresh: true,
              onRefresh: self => {
                const fade = self.animation.getChildren().find(t => t.vars.autoAlpha === 1);
                if (!fade) return;
                const progress = self.animation.totalProgress();
                // Reveal over the existing initial offset, not the whole
                // parallax range: anchor navigation may end before that range.
                fade.duration(audienceOffset() / audienceRange());
                self.animation.invalidate().totalProgress(progress);
              },
          },
        }).fromTo(audienceCopy, { y: audienceOffset }, { y: 0, duration: 1 }, 0)
          .fromTo(audienceCopy, { autoAlpha: 0 },
            { autoAlpha: 1, duration: audienceOffset() / audienceRange() }, 0);

      }, hero);

      engine = lenis ? 'lenis-gsap-scrolltrigger' : 'gsap-scrolltrigger';
      refresh();
    } catch (error) {
      teardown();
      engine = 'native-initialization-error';
      console.warn('SyntheCore: smooth scrolling unavailable; keeping native scrolling.', error);
    }
  }

  if (available) {
    gsap.registerPlugin(ScrollTrigger);
    // The shared queue owns resize refreshes; keep GSAP's load/visibility
    // refresh. Otherwise each module + the built-in resize listener refresh
    // the entire chain independently, possibly mid-inertia.
    ScrollTrigger.config({autoRefreshEvents:'visibilitychange,DOMContentLoaded,load'});
    ScrollTrigger.addEventListener('refresh', resizeLenis);
  }
  reduced.addEventListener('change', rebuild);
  compact.addEventListener('change', rebuild);
  mouse.addEventListener('change', rebuild);
  window.addEventListener('orientationchange', refresh);
  window.addEventListener('resize', refresh, {passive:true});
  window.addEventListener('pageshow', refresh);
  document.addEventListener('click', anchorClick, { capture: true });
  document.addEventListener('keydown', keyboardScroll);
  window.addEventListener('popstate', () => {
    pendingAnchor = null;
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
      if (lenis) lenis.scrollTo(target, { immediate: true, force: true });
      else target.scrollIntoView({ behavior: 'instant', block: 'start' });
    }
  }
}, { once: true });
