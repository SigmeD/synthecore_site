/* SyntheCore Services v46.
   Vertical scrolling drives a pinned horizontal gallery on desktop.
   One global Lenis remains owned by hero-scroll.js; no wheel handlers.
   No changes to Hero / Audiences / Works or their ScrollTriggers. */
document.addEventListener('DOMContentLoaded', () => {
  const section = document.querySelector('#services.sc-services');
  if (!section) return;

  const scene = section.querySelector('.sc-services__scene');
  const viewport = section.querySelector('.sc-services__viewport');
  const track = section.querySelector('[data-services-track]');
  const cards = [...section.querySelectorAll('.sc-service-card')];
  const previous = section.querySelector('[data-services-prev]');
  const next = section.querySelector('[data-services-next]');
  const bar = section.querySelector('[data-services-progress-bar]');
  if (!scene || !viewport || !track || !cards.length || !previous || !next || !bar) return;

  const gsap = window.gsap;
  const ScrollTrigger = window.ScrollTrigger;
  const canAnimate = Boolean(gsap && ScrollTrigger);
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const wide = window.matchMedia('(min-width: 851px) and (min-height: 650px)');
  const pinEnabled = () => canAnimate && wide.matches && !reduced.matches;

  let pinned = false;
  let horizontal = null;
  let entrance = null;
  let resizeObserver = null;
  let refreshFrame = 0;
  const motion = Object.freeze({
    minScrollDistance: 250,
    travelMultiplier: 1.08,
    entryMaxPx: 35,
    entryViewportRatio: 0.045,
    pinScrub: true
  });
  let drag = null;

  const railTravel = () => Math.max(0,track.scrollWidth - viewport.clientWidth);
  const travelDistance = () => Math.max(motion.minScrollDistance,
    Math.round(railTravel() * motion.travelMultiplier));

  // Coalesce ResizeObserver, media-query and window resize notifications into
  // one geometry pass. Pin refreshes are expensive and affect later scenes.
  function requestGeometryRefresh(){
    if(refreshFrame) return;
    refreshFrame=requestAnimationFrame(()=>{
      refreshFrame=0;
      if(pinned) {
        section.style.setProperty('--sc-services-scroll-length', `${travelDistance()}px`);
        (window.SyntheCoreMotion?.requestRefresh || (()=>ScrollTrigger?.refresh()))();
      }
      else nativeUpdate();
    });
  }

  function updateProgress(progress){
    const amount = Math.max(0,Math.min(1,progress));
    bar.style.transform = `scaleX(${amount.toFixed(5)})`;
    const active = Math.round(amount*(cards.length-1))+1;
    section.querySelector('.sc-services__count').textContent =
      `${String(active).padStart(2,'0')} — ${String(cards.length).padStart(2,'0')}`;
    previous.disabled = amount < .01;
    next.disabled = amount > .99;
  }

  function nativeUpdate(){
    if (pinned) return;
    updateProgress(viewport.scrollLeft / Math.max(1,viewport.scrollWidth-viewport.clientWidth));
  }
  // Programmatic vertical navigation uses the SAME Lenis owner as the rest
  // of the page. Native smooth scroll on top of Lenis caused double easing.
  function scrollVertically(top, immediate=false){
    if(window.SyntheCoreMotion?.scrollTo){
      window.SyntheCoreMotion.scrollTo(top,{immediate});
    }else{
      window.scrollTo({top,behavior:immediate||reduced.matches?'instant':'smooth'});
    }
  }
  function move(direction){
    if(pinned){
      const trigger = horizontal?.scrollTrigger;
      if(!trigger) return;
      const targetProgress = Math.max(0,Math.min(1,trigger.progress+direction/(cards.length-1)));
      const scroll = trigger.start+(trigger.end-trigger.start)*targetProgress;
      // Navigation uses native document scroll; the existing Lenis instance
      // observes it just as it observes other anchor interactions.
      scrollVertically(scroll, reduced.matches);
      return;
    }
    const width = cards[0].getBoundingClientRect().width;
    const gap = parseFloat(getComputedStyle(track).gap)||12;
    viewport.scrollBy({left:(width+gap)*direction,behavior:reduced.matches?'instant':'smooth'});
  }
  previous.addEventListener('click',()=>move(-1));
  next.addEventListener('click',()=>move(1));
  viewport.addEventListener('scroll',nativeUpdate,{passive:true});
  // Keyboard focus must use the existing pin, rather than independently
  // scrolling an overflow:hidden viewport underneath the translated track.
  cards.forEach(card=>card.addEventListener('focus',()=>{
    if(!pinned||!card.matches(':focus-visible'))return;
    requestAnimationFrame(()=>{
      const trigger=horizontal?.scrollTrigger;
      if(!trigger)return;
      const offset=card.getBoundingClientRect().left-track.getBoundingClientRect().left;
      const edge=parseFloat(getComputedStyle(track).paddingLeft)||0;
      const progress=Math.max(0,Math.min(1,(offset-edge)/Math.max(1,railTravel())));
      viewport.scrollLeft=0;
      scrollVertically(trigger.start+(trigger.end-trigger.start)*progress,true);
      ScrollTrigger.update();
    });
  }));
  track.addEventListener('keydown',event => {
    if(!['ArrowRight','ArrowLeft','Home','End'].includes(event.key)) return;
    if(event.target!==track)return;
    event.preventDefault();
    if(event.key==='Home'||event.key==='End'){
      if(!pinned) viewport.scrollTo({left:event.key==='Home'?0:viewport.scrollWidth,behavior:reduced.matches?'instant':'smooth'});
      else scrollVertically(event.key==='Home'?horizontal.scrollTrigger.start:horizontal.scrollTrigger.end,reduced.matches);
    }else move(event.key==='ArrowRight'?1:-1);
  });
  track.addEventListener('pointerdown',event => {
    if(pinned||event.pointerType!=='mouse'||event.button!==0)return;
    drag={id:event.pointerId,startX:event.clientX,startScroll:viewport.scrollLeft,moved:false};
  });
  track.addEventListener('pointermove',event => {
    if(!drag||drag.id!==event.pointerId||pinned)return;
    if(!drag.moved && Math.abs(event.clientX-drag.startX)>6){
      drag.moved=true;
      track.classList.add('is-dragging');
      track.setPointerCapture(event.pointerId);
    }
    if(drag.moved)viewport.scrollLeft=drag.startScroll-(event.clientX-drag.startX);
  });
  function stopDrag(){drag=null;track.classList.remove('is-dragging')}
  track.addEventListener('pointerup',stopDrag);
  track.addEventListener('pointercancel',stopDrag);
  track.addEventListener('lostpointercapture',stopDrag);

  function destroy(){
    // Kill pinned trigger before entrance; ScrollTrigger removes its spacer.
    horizontal?.scrollTrigger?.kill();
    horizontal?.kill();
    entrance?.scrollTrigger?.kill();
    entrance?.kill();
    horizontal=null;entrance=null;
    pinned=false;
    section.classList.remove('sc-services--pinned');
    section.style.removeProperty('--sc-services-scroll-length');
    if(gsap){gsap.set(scene,{clearProps:'transform,opacity,visibility'});gsap.set(track,{clearProps:'transform'});}
    updateProgress(0);
  }

  function setup(){
    destroy();
    if(pinEnabled() && railTravel()>1){
      pinned=true;
      section.classList.add('sc-services--pinned');
      section.style.setProperty('--sc-services-scroll-length', `${travelDistance()}px`);
      // The entry completes EXACTLY when pin starts. No numeric scrub lag
      // can leave the scene translated as ScrollTrigger switches pin modes.
      entrance=gsap.fromTo(scene,
        {y:()=>Math.min(motion.entryMaxPx,window.innerHeight*motion.entryViewportRatio),autoAlpha:1},
        {y:0,autoAlpha:1,ease:'none',
          scrollTrigger:{
            id:'sc-services-entry',trigger:section,
            start:'top bottom',end:'top top',
            scrub:true,invalidateOnRefresh:true,refreshPriority:-15
          }
        }
      );
      // The horizontal tween is owned by its ONE pinned ScrollTrigger.
      // Lenis owns wheel easing; the horizontal tween tracks the pin exactly.
      // Numeric scrub lag could leave the rail moving after pin release.
      horizontal=gsap.to(track,{
        x:()=>-railTravel(),
        ease:'none',
        onUpdate:()=>updateProgress(Math.min(1, Math.abs(Number(gsap.getProperty(track,'x')) || 0) / Math.max(1,railTravel()))),
        scrollTrigger:{
          id:'sc-services-pin',
          trigger:section,
          start:'top top',
          end:()=>`+=${travelDistance()}`,
          // A sticky scene replaces the ScrollTrigger pin-spacer.
          scrub:motion.pinScrub,
          invalidateOnRefresh:true,
          refreshPriority:-20
        }
      });
      requestGeometryRefresh();
    }else{
      updateProgress(0);
      nativeUpdate();
    }
    section.classList.add('sc-services--ready');
  }

  // Rebuild only when crossing the pinned/native boundary; ordinary resizes
  // just ask ScrollTrigger to recompute geometry from current DOM dimensions.
  let lastMode=null;
  function reconcile(){
    const nextMode=pinEnabled();
    // A gallery may gain/lose horizontal overflow after responsive reflow.
    if(lastMode!==nextMode || (nextMode && (railTravel()>1)!==pinned)){
      lastMode=nextMode;
      setup();
    } else requestGeometryRefresh();
  }
  reduced.addEventListener('change',reconcile);
  wide.addEventListener('change',reconcile);
  window.addEventListener('resize',requestGeometryRefresh,{passive:true});
  if('ResizeObserver' in window){
    let lastWidth=viewport.clientWidth;
    let lastTravel=railTravel();
    resizeObserver=new ResizeObserver(()=>{
      const width=viewport.clientWidth;
      const travel=railTravel();
      if(width===lastWidth && Math.abs(travel-lastTravel)<1) return;
      lastWidth=width;
      lastTravel=travel;
      // The fixed/native mode may be unchanged while overflow changes.
      reconcile();
    });
    resizeObserver.observe(viewport);
    resizeObserver.observe(track);
  }
  window.addEventListener('load',()=>{
    requestGeometryRefresh();
  },{once:true});
  reconcile();
  window.__synthecoreServicesQA={
    getState:()=>({
      mode:pinned?'pinned-horizontal':'native-horizontal',
      cards:cards.length,
      travel:railTravel(),
      scrollLeft:viewport.scrollLeft,
      pinActive:horizontal?.scrollTrigger?.isActive??false,
      pinStart:horizontal?.scrollTrigger?.start??null,
      pinEnd:horizontal?.scrollTrigger?.end??null,
      progress:section.querySelector('.sc-services__count')?.textContent
    })
  };
});
