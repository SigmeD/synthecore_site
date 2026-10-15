/* Works v29. Sticky positioning is pure CSS.
   GSAP animates exactly one transform on each independent card.
   The existing Lenis instance in hero-scroll.js remains the only scroll engine. */
document.addEventListener('DOMContentLoaded', () => {
  const section = document.querySelector('#works');
  if (!section) return;
  const items = [...section.querySelectorAll('.sc-work-item')];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const gsap = window.gsap, ScrollTrigger = window.ScrollTrigger;
  let tweens = [];
  let mode = 'initial';
  function setup() {
    tweens.forEach(tween => tween.kill());
    tweens = [];
    for (const item of items) {
      const frame = item.querySelector('.sc-work-frame');
      if (frame) gsap?.set(frame, {clearProps:'transform,transformOrigin'});
      const caption=item.querySelector('.sc-work-content');
      if (caption){caption.style.removeProperty('--glass-y');caption.style.removeProperty('--glass-glint');}
    }
    const fallback = reduced.matches || !gsap || !ScrollTrigger;
    section.classList.toggle('sc-works--fallback',fallback);
    if (fallback) {mode = reduced.matches ? 'reduced-motion' : 'no-gsap';return;}
    gsap.registerPlugin(ScrollTrigger);
    items.forEach((item,index) => {
      const frame = item.querySelector('.sc-work-frame');
      if (!frame) return;
      const caption = item.querySelector('.sc-work-content');
      // One timeline per card. Light glass motion uses the SAME scale progress.
      // No separate ScrollTrigger and no per-frame blur animation.
      tweens.push(gsap.fromTo(frame,
        {scale:innerWidth<=480 ? .90 : .885,transformOrigin:'50% 0%'},
        {scale:1,ease:'none',immediateRender:true,
         onUpdate:function(){
           if (!caption || innerWidth <= 850) return;
           const p=this.progress();
           caption.style.setProperty('--glass-y',((1-p)*8).toFixed(2)+'px');
           caption.style.setProperty('--glass-glint',((p*12)-6).toFixed(2)+'%');
         },
         scrollTrigger:{id:'sc-work-'+index,trigger:item,start:'top bottom',end:'top top',scrub:1.05,invalidateOnRefresh:true,refreshPriority:-10}}
      ));
    });
    mode = 'single-frame-scale';
    ScrollTrigger.refresh();
  }
  reduced.addEventListener('change',setup);
  window.addEventListener('resize',() => ScrollTrigger?.refresh());
  setup();
  window.__synthecoreWorksQA = {
    getState:() => ({mode,itemCount:items.length,items:items.map((item,index) => {
      const card=item.querySelector('.sc-work-frame');const r=card.getBoundingClientRect();
      return {index,id:item.dataset.workId,cardTop:r.top,width:r.width,height:r.height,scale:tweens[index] ? gsap.getProperty(card,'scale'):1,
        progress:tweens[index]?.scrollTrigger?.progress ?? null,sticky:getComputedStyle(item).position};
    })}),
    refresh:() => ScrollTrigger?.refresh()
  };
});
