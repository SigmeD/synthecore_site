/* Works v45. Single GSAP ScrollTrigger pins one stage and advances the six
   approved project cards in a consistent timeline. No fixed per-card vh spacer.
   The global Lenis remains owned exclusively by hero-scroll.js. */
document.addEventListener('DOMContentLoaded', () => {
  const section = document.querySelector('#works.sc-works');
  if (!section) return;
  const stack = section.querySelector('.sc-works-stack');
  const items = [...section.querySelectorAll('.sc-work-item')];
  const frames = items.map(item => item.querySelector('.sc-work-frame'));
  const captions = items.map(item => item.querySelector('.sc-work-content'));
  const gsap = window.gsap;
  const ScrollTrigger = window.ScrollTrigger;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  // Motion geometry is isolated here; these values reproduce the accepted v60/v61 look.
  const motion = Object.freeze({
    scrollScreensPerCard: 0.92,
    mobileScale: 0.9,
    desktopScale: 0.885,
    entranceEase: 'none',
    cardEase: 'sine.inOut'
  });
  const smallPhone = window.matchMedia('(max-width: 480px)');
  const glassMotion = window.matchMedia('(min-width: 851px)');
  const hero = document.querySelector('#imageScrollSticky > .hero');
  let usedHeight = 0;
  let surfaceFrame = null;
  let resizeFrame = null;
  function syncSurfaceHeight() {
    const height = hero?.getBoundingClientRect().height;
    if (!(height > 0) || Math.abs(height - usedHeight) < 0.01) return false;
    usedHeight = height;
    section.style.setProperty('--hero-used-height', height + 'px');
    return true;
  }
  let timeline = null;
  let entrance = null;
  let mode = 'initial';

  const reset = () => {
    const current = timeline;
    const entering = entrance;
    timeline = null;
    entrance = null;
    entering?.scrollTrigger?.kill();
    entering?.kill();
    current?.scrollTrigger?.kill();
    current?.kill();
    if (gsap) {
      gsap.set(items, {clearProps:'transform,opacity,visibility'});
      gsap.set(frames.filter(Boolean),{clearProps:'transform,transformOrigin'});
    }
    captions.forEach(caption => {
      if (!caption) return;
      caption.style.removeProperty('--glass-y');
      caption.style.removeProperty('--glass-glint');
    });
    section.classList.remove('sc-works--timeline');
    section.style.removeProperty('--sc-works-scroll-length');
  };

  function setup() {
    reset();
    syncSurfaceHeight();
    if (!gsap || !ScrollTrigger || reduced.matches || items.length < 2 || frames.some(f => !f) || !stack) {
      mode = reduced.matches ? 'reduced-motion' : 'fallback';
      return;
    }
    gsap.registerPlugin(ScrollTrigger);
    section.classList.add('sc-works--timeline');
    items.forEach((item,index) => item.style.setProperty('--sc-work-layer',index+1));
    const scaleStart = () => smallPhone.matches ? motion.mobileScale : motion.desktopScale;
    gsap.set(items, {y:0,autoAlpha:1});
    gsap.set(items.slice(1), {y:()=>innerHeight});
    gsap.set(frames, {scale:1,transformOrigin:'50% 0%'});
    gsap.set(frames,{scale:scaleStart});

    // The FIRST card used to be at scale 1 immediately, unlike every
    // successor. Its approach now animates over the natural scroll between
    // the section entering the viewport and its pinned stage starting.
    // Pin begins exactly where this entrance completes: no extra spacer,
    // no double pin, and no transform jump at the hand-off.
    entrance = gsap.timeline({
      scrollTrigger: {
        id:'sc-works-first-entry', trigger:section,
        start:'top bottom', end:'top top',
        scrub:true, invalidateOnRefresh:true,
        refreshPriority:-4
      }
    }).fromTo(frames[0],
      {scale:scaleStart},
      {scale:1,duration:1,ease:motion.entranceEase,immediateRender:false},0);
    if (glassMotion.matches && captions[0]) {
      entrance.fromTo(captions[0],
        {'--glass-y':'8px','--glass-glint':'-6%'},
        {'--glass-y':'0px','--glass-glint':'6%',duration:1,ease:motion.entranceEase,immediateRender:false},0);
    }

    const stages = items.length - 1;
    section.style.setProperty('--sc-works-scroll-length', `${Math.round(stages*innerHeight*motion.scrollScreensPerCard)}px`);
    const tl = gsap.timeline({
      defaults:{ease:'none'},
      scrollTrigger:{
        id:'sc-works-timeline', trigger:section,
        start:'top top',
        end:()=>'+='+Math.round(stages*innerHeight*motion.scrollScreensPerCard),
        // CSS sticky holds the stack; no dynamic GSAP pin spacer.
        scrub:true,
        invalidateOnRefresh:true, refreshPriority:-5
      }
    });
    // A new card covers the previous one. Each preceding card remains still
    // until its successor has arrived; none is displaced prematurely.
    for (let index=1; index<items.length; index++) {
      const at = index-1;
      tl.fromTo(items[index], {y:()=>innerHeight}, {y:0,duration:1,ease:'none',immediateRender:false},at);
      tl.fromTo(frames[index], {scale:scaleStart}, {scale:1,duration:1,ease:motion.cardEase,immediateRender:false},at);
      if (glassMotion.matches && captions[index]) {
        tl.fromTo(captions[index],{'--glass-y':'8px','--glass-glint':'-6%'},
          {'--glass-y':'0px','--glass-glint':'6%',duration:1,ease:motion.cardEase,immediateRender:false},at);
      }
    }
    timeline=tl;
    mode='single-pinned-timeline';
    (window.SyntheCoreMotion?.requestRefresh || (()=>ScrollTrigger.refresh()))();
  }

  reduced.addEventListener('change', setup);
  // Caption tweens are added only on wide screens; refresh() cannot add or
  // remove them. Rebuild when the 850px/480px motion branches change.
  glassMotion.addEventListener('change', setup);
  smallPhone.addEventListener('change', setup);
  // Rebuild the same timeline after viewport changes, dropping cached startAt
  // values for reverse traversal as well as untouched incoming cards.
  window.addEventListener('resize',()=>{
    if (resizeFrame !== null) cancelAnimationFrame(resizeFrame);
    resizeFrame = requestAnimationFrame(()=>{
      resizeFrame = null;
      setup();
    });
  },{passive:true});
  window.addEventListener('load',()=>{if(timeline)window.SyntheCoreMotion?.requestRefresh();},{once:true});
  if (hero && 'ResizeObserver' in window) new ResizeObserver(()=>{
    if (surfaceFrame !== null) return;
    surfaceFrame = requestAnimationFrame(()=>{
      surfaceFrame = null;
      if (syncSurfaceHeight()) (window.SyntheCoreMotion?.requestRefresh || (()=>ScrollTrigger?.refresh()))();
    });
  }).observe(hero);
  setup();
  window.__synthecoreWorksQA = {
    getState:()=>({
      mode,itemCount:items.length,
      progress:timeline?.scrollTrigger?.progress ?? null,
      firstEntryProgress:entrance?.scrollTrigger?.progress ?? null,
      firstEntryStart:entrance?.scrollTrigger?.start ?? null,
      firstEntryEnd:entrance?.scrollTrigger?.end ?? null,
      pinStart:timeline?.scrollTrigger?.start ?? null,
      pinEnd:timeline?.scrollTrigger?.end ?? null,
      timelineDuration:timeline?.duration() ?? null,
      cards:items.map((item,i)=>({id:item.dataset.workId,
        top:Math.round(item.getBoundingClientRect().top),
        scale:frames[i] ? gsap?.getProperty(frames[i],'scale') ?? 1 : 1}))
    }), refresh:()=>ScrollTrigger?.refresh()
  };
});
