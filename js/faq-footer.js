/* FAQ + light contact footer: isolated from approved GSAP/Lenis sections. */
(()=>{
  const faq=document.querySelector('#faq.sc-faq');
  if(!faq)return;
  const items=[...faq.querySelectorAll('[data-sc-faq-item]')];
  function setOpen(item,open){item.classList.toggle('is-open',open);item.querySelector('.sc-faq__question').setAttribute('aria-expanded',String(open));item.querySelector('.sc-faq__answer-region').setAttribute('aria-hidden',String(!open));}
  for(const item of items){item.querySelector('.sc-faq__question').addEventListener('click',()=>{
    const opening=!item.classList.contains('is-open');
    for(const other of items)setOpen(other,other===item&&opening);
  });}
  // Wait until accordion layout settles, then recalculate global trigger
  // positions and the existing Lenis dimensions through its refresh listener.
  if('ResizeObserver' in window){
    let refreshTimer;
    const observer=new ResizeObserver(()=>{
      clearTimeout(refreshTimer);
      refreshTimer=setTimeout(()=>window.ScrollTrigger?.refresh(true),120);
    });
    observer.observe(faq);
  }
  // Roveia-like handoff: only the incoming FAQ content shifts a few pixels.
  // No opacity, no new ScrollTrigger pin, and no changes to the v58 reviews.
  const faqMotion=matchMedia('(min-width: 1200px) and (min-height: 800px)');
  let faqScheduled=false;
  function updateFaqEntry(){
    faqScheduled=false;
    const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
    if(!faqMotion.matches||reduce){faq.style.setProperty('--sc-faq-entry-offset','0px');return;}
    const top=faq.getBoundingClientRect().top;
    const viewport=innerHeight;
    const t=Math.max(0,Math.min(1,(viewport-top)/(viewport*.9)));
    const ease=t*t*(3-2*t);
    faq.style.setProperty('--sc-faq-entry-offset',((1-ease)*24).toFixed(2)+'px');
  }
  function scheduleFaq(){if(!faqScheduled){faqScheduled=true;requestAnimationFrame(updateFaqEntry);}}
  addEventListener('scroll',scheduleFaq,{passive:true});
  addEventListener('resize',scheduleFaq,{passive:true});
  faqMotion.addEventListener?.('change',scheduleFaq);
  matchMedia('(prefers-reduced-motion: reduce)').addEventListener?.('change',scheduleFaq);
  scheduleFaq();
  const footer=document.querySelector('#contact.sc-footer');
  const waves=footer?[...footer.querySelectorAll('.sc-footer__wave')]:[];
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
  let queued=false;
  // Ambient movement runs independently on the SVGs. Scroll only lifts each wave
  // a short distance, without resetting its continuous motion or deforming the text.
  function update(){
    queued=false;
    for(const wave of waves){
      const svg=wave.querySelector('svg');
      if(svg && typeof svg.pauseAnimations==='function'){
        if(reduced.matches)svg.pauseAnimations();else svg.unpauseAnimations();
      }
    }
    if(reduced.matches){for(const wave of waves)wave.style.setProperty('--wave-scroll-y','0px');return;}
    const r=footer.getBoundingClientRect(),vh=window.innerHeight;
    const p=Math.min(1,Math.max(0,(vh-r.top)/(vh+r.height*.8)));
    waves.forEach((wave,i)=>wave.style.setProperty('--wave-scroll-y',((1-p)*[46,37,27][i]).toFixed(2)+'px'));
  }
  function schedule(){if(queued)return;queued=true;requestAnimationFrame(update);}
  if(footer){addEventListener('scroll',schedule,{passive:true});addEventListener('resize',schedule,{passive:true});if(reduced.addEventListener)reduced.addEventListener('change',schedule);schedule();}
})();
