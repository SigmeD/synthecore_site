/* SyntheCore v58: four opaque reviews travel right-to-left through one
 * long, scroll-linked sticky scene. Geometry is viewport-derived; scroll
 * coordinates are softly interpolated (not separate GSAP card tweens).
 * Final card remains visible at the left edge as the sticky scene releases.
 * Center-stage cards lift automatically; pointer hover is an extra effect.
 * Heading never fades, previous banner remains an independent section.
 * Demonstration content cannot be published as authentic testimonials. */
document.addEventListener('DOMContentLoaded', () => {
  const section = document.querySelector('#testimonials.sc-testimonials');
  if (!section) return;
  const scene = section.querySelector('.sc-testimonials__scene');
  const cards = [...section.querySelectorAll('.sc-testimonials__card-slot')];
  const heading = section.querySelector('.sc-testimonials__center-inner');
  const previousBanner = document.querySelector('#process .sc-process__banner');
  const gsap = window.gsap;
  const ScrollTrigger = window.ScrollTrigger;
  const desktop = matchMedia('(min-width: 1200px) and (min-height: 800px)');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const smoothstep = (a, b, v) => { const t = clamp((v - a)/(b - a), 0, 1); return t*t*(3-2*t); };
  const canAnimate = () => !!(gsap && ScrollTrigger && desktop.matches && !reduced.matches && cards.length >= 3);
  const yOffsets = [-26, 35, -20, 28];
  const rotations = [-4.2, 3.3, -2.8, 3.6];
  let trigger = null;
  let mode = 'native';
  let targetProgress = 0;
  let renderedProgress = 0;
  let raf = 0;
  let lastTime = 0;

  function draw(progress) {
    renderedProgress = clamp(progress, 0, 1);
    const vw = scene.clientWidth || innerWidth;
    const vh = scene.clientHeight || innerHeight;
    const cardWidth = cards[0]?.offsetWidth || 300;
    const sceneTop = section.getBoundingClientRect().top;
    const entry = smoothstep(innerHeight*.72, 0, sceneTop);
    const firstCenter = vw - cardWidth * .03;  // substantial right-edge preview
    const spacing = vw * .36;                   // next enters before previous exits
    // Let the fourth card finish just beyond the centre and stay partially
    // visible near the left edge when the next section begins rising.
    // The preceding cards have already exited through the left boundary.
    const endCenter = cardWidth * .52 + vw * .02;
    const travel = firstCenter + (cards.length - 1) * spacing - endCenter;
    const stageShift = travel * renderedProgress;

    cards.forEach((card, i) => {
      const cardCenter = firstCenter + i * spacing - stageShift;
      const normalized = (cardCenter - vw*.5)/(vw*.5 + cardWidth);
      const centreFocus = 1 - smoothstep(.1, 1.15, Math.abs(normalized));
      // Automatic centre emphasis, not gated behind hover.
      // Both lift and scale smoothly reverse when scrolling upwards.
      const scale = .955 + .125 * centreFocus;
      const rotation = rotations[i % rotations.length] + clamp(normalized, -1, 1) * 1.8;
      const centreY = vh*.495 + yOffsets[i % yOffsets.length] - 92*(1-entry);
      const centerLift = 24 * centreFocus;
      const y = centreY - card.offsetHeight/2 - centerLift;
      // Cards remain opaque. They leave ONLY via the clipped viewport edges.
      gsap.set(card, {
        left: '0px', top:'0px', x:cardCenter, xPercent:-50, y,
        rotation, scale, opacity:1, visibility:'visible', force3D:true,
        zIndex:Math.round(centreFocus*10)+3,
        pointerEvents:(cardCenter < -cardWidth || cardCenter > vw+cardWidth) ? 'none':'auto'
      });
    });

    // Before the sticky frame reaches top: the title is already completely
    // visible / dark as the process banner scrolls out above it.
    if (heading) gsap.set(heading, {y:-220*(1-entry),opacity:1,scale:1});
    if (previousBanner) gsap.set(previousBanner, {y:-17*entry,scale:1-.014*entry,opacity:1});
  }

  function tick(time) {
    const dt = lastTime ? Math.min(.05,(time-lastTime)/1000) : .016;
    lastTime = time;
    // Time-independent damping prevents jumps during fast wheel input.
    const amount = 1-Math.exp(-dt/.24);
    renderedProgress += (targetProgress-renderedProgress)*amount;
    if (Math.abs(targetProgress-renderedProgress) < .00012) renderedProgress = targetProgress;
    draw(renderedProgress);
    if (renderedProgress !== targetProgress && mode === 'scroll-stream') {
      raf = requestAnimationFrame(tick);
    } else {
      raf = 0;
      lastTime = 0;
    }
  }

  function schedule(progress) {
    targetProgress = clamp(progress,0,1);
    if (!raf) raf = requestAnimationFrame(tick);
  }

  function teardown() {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;lastTime = 0;
    trigger?.kill(); trigger = null;
    section.classList.remove('sc-testimonials--motion');
    if (gsap) {
      gsap.set(cards,{clearProps:'all'});
      if (heading) gsap.set(heading,{clearProps:'all'});
      if (previousBanner) gsap.set(previousBanner,{clearProps:'transform,opacity,willChange'});
    }
    for (const card of cards) {
      card.style.removeProperty('pointer-events');
      card.style.removeProperty('z-index');
      card.style.removeProperty('visibility');
    }
    targetProgress = renderedProgress = 0;
    mode='native';
  }

  function setup() {
    teardown();
    if (!canAnimate()) return;
    gsap.registerPlugin(ScrollTrigger);
    mode='scroll-stream';
    section.classList.add('sc-testimonials--motion');
    trigger=ScrollTrigger.create({
      id:'sc-testimonials-card-stream', trigger:section,
      start:'top 72%',end:'bottom bottom',
      invalidateOnRefresh:true,refreshPriority:-30,
      onUpdate:self=>schedule(self.progress),
      onRefresh:self=>{targetProgress=self.progress;renderedProgress=self.progress;draw(self.progress);}
    });
    targetProgress=renderedProgress=trigger.progress;
    draw(renderedProgress);
    ScrollTrigger.refresh();
  }

  function reconcile() {
    if (canAnimate() !== (mode==='scroll-stream')) setup();
    else if (mode==='scroll-stream') trigger?.refresh();
  }
  // Preserve the v58 scroll geometry for wheel/touch. Keyboard focus seeks
  // within that same stream instead of scrolling the clipped sticky scene.
  cards.forEach((card,index)=>card.addEventListener('focusin',event=>{
    if(mode!=='scroll-stream'||!event.target.matches(':focus-visible'))return;
    requestAnimationFrame(()=>{
      if(!trigger||mode!=='scroll-stream')return;
      scene.scrollLeft=0;
      section.querySelector('.sc-testimonials__cards').scrollLeft=0;
      const vw=scene.clientWidth||innerWidth,cardWidth=cards[0].offsetWidth;
      const firstCenter=vw-cardWidth*.03,spacing=vw*.36;
      const travel=firstCenter+(cards.length-1)*spacing-(cardWidth*.52+vw*.02);
      const progress=clamp((firstCenter+index*spacing-vw*.5)/travel,0,1);
      window.scrollTo({top:trigger.start+(trigger.end-trigger.start)*progress,behavior:'instant'});
      ScrollTrigger.update();
      schedule(progress);
    });
  }));
  desktop.addEventListener('change',reconcile);
  reduced.addEventListener('change',reconcile);
  addEventListener('resize',reconcile,{passive:true});
  addEventListener('load',()=>{if(mode==='scroll-stream')ScrollTrigger?.refresh();},{once:true});
  setup();
  window.__synthecoreTestimonialsQA={getState:()=>({
    mode, cards:cards.length,progress:trigger?.progress ?? null,
    renderedProgress,sceneTop:scene.getBoundingClientRect().top,
    pins:ScrollTrigger?.getAll().filter(t=>t.vars.pin&&String(t.vars.id||'').includes('testimonials')).length ?? 0,
    headingOpacity:heading?Number(getComputedStyle(heading).opacity):null,
    cardOpacities:cards.map(card=>Number(getComputedStyle(card).opacity)),
    scales:cards.map(card=>{const m=new DOMMatrixReadOnly(getComputedStyle(card).transform);return Number(Math.hypot(m.a,m.b).toFixed(3));}),
    lifts:cards.map(card=>{const m=new DOMMatrixReadOnly(getComputedStyle(card).transform);return Number(m.m42.toFixed(1));}),
    positions:cards.map(card=>({left:Math.round(card.getBoundingClientRect().left),right:Math.round(card.getBoundingClientRect().right)}))
  })};
});
