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
  const STAGE_PER_CARD = 0.92;
  let timeline = null;
  let mode = 'initial';

  const reset = () => {
    const current = timeline;
    timeline = null;
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
  };

  function setup() {
    reset();
    if (!gsap || !ScrollTrigger || reduced.matches || items.length < 2 || frames.some(f => !f) || !stack) {
      mode = reduced.matches ? 'reduced-motion' : 'fallback';
      return;
    }
    gsap.registerPlugin(ScrollTrigger);
    section.classList.add('sc-works--timeline');
    items.forEach((item,index) => item.style.setProperty('--sc-work-layer',index+1));
    const scaleStart = () => innerWidth <= 480 ? .9 : .885;
    gsap.set(items, {y:0,autoAlpha:1});
    gsap.set(items.slice(1), {y:()=>innerHeight});
    gsap.set(frames, {scale:1,transformOrigin:'50% 0%'});
    gsap.set(frames.slice(1),{scale:scaleStart});

    const stages = items.length - 1;
    const tl = gsap.timeline({
      defaults:{ease:'none'},
      scrollTrigger:{
        id:'sc-works-timeline', trigger:section,
        start:'top top',
        end:()=>'+='+Math.round(stages*innerHeight*STAGE_PER_CARD),
        pin:true, pinSpacing:true,
        scrub:true, anticipatePin:1,
        invalidateOnRefresh:true, refreshPriority:-5
      }
    });
    // A new card covers the previous one. Each preceding card remains still
    // until its successor has arrived; none is displaced prematurely.
    for (let index=1; index<items.length; index++) {
      const at = index-1;
      tl.fromTo(items[index], {y:()=>innerHeight}, {y:0,duration:1,immediateRender:false},at);
      tl.fromTo(frames[index], {scale:scaleStart}, {scale:1,duration:1,immediateRender:false},at);
      if (innerWidth>850 && captions[index]) {
        tl.fromTo(captions[index],{'--glass-y':'8px','--glass-glint':'-6%'},
          {'--glass-y':'0px','--glass-glint':'6%',duration:1,immediateRender:false},at);
      }
    }
    timeline=tl;
    mode='single-pinned-timeline';
    ScrollTrigger.refresh();
  }

  reduced.addEventListener('change', setup);
  // On resize GSAP invalidates function-based geometry; no manual spacers.
  window.addEventListener('resize',()=>ScrollTrigger?.refresh(),{passive:true});
  window.addEventListener('load',()=>ScrollTrigger?.refresh(),{once:true});
  setup();
  window.__synthecoreWorksQA = {
    getState:()=>({
      mode,itemCount:items.length,
      progress:timeline?.scrollTrigger?.progress ?? null,
      pinStart:timeline?.scrollTrigger?.start ?? null,
      pinEnd:timeline?.scrollTrigger?.end ?? null,
      timelineDuration:timeline?.duration() ?? null,
      cards:items.map((item,i)=>({id:item.dataset.workId,
        top:Math.round(item.getBoundingClientRect().top),
        scale:frames[i] ? gsap?.getProperty(frames[i],'scale') ?? 1 : 1}))
    }), refresh:()=>ScrollTrigger?.refresh()
  };
});
