/* v20 source: detail-stage1.js */
/* Scoped carousel. Three (desktop), two (tablet), or one (mobile) original catalog cards in view.
   Edge clones allow true wrap on both arrow clicks and touch swipes; they use
   the SAME underlying .case-card component. The modal script initializes after this file. */
(() => {
  'use strict';
  const viewport=document.getElementById('relatedViewport');
  const track=viewport?.querySelector('.related-work__track');
  if (!viewport || !track)return;
  const originals=[...track.querySelectorAll(':scope > .case-card')];
  const n=originals.length;
  if(n<2)return;
  const clonesCount=Math.min(3,n);
  const clonesBefore=originals.slice(-clonesCount).map(el=>el.cloneNode(true));
  const clonesAfter=originals.slice(0,clonesCount).map(el=>el.cloneNode(true));
  [...clonesBefore,...clonesAfter].forEach(el=>{
    el.dataset.carouselClone='';
    el.setAttribute('aria-hidden','true');
    el.querySelectorAll('a,button,input,select,textarea,[tabindex]').forEach(control=>{control.tabIndex=-1;});
  });
  clonesBefore.reverse().forEach(el=>track.prepend(el));
  clonesAfter.forEach(el=>track.append(el));
  const all=[...track.querySelectorAll(':scope > .case-card')];
  const first=clonesCount;
  const last=first+n-1;
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
  let settling=null;
  let internal=false;
  const pos=i=>all[i].offsetLeft;
  const current=()=>{
    let index=0,dist=Infinity;
    for(let i=0;i<all.length;i++){
      const d=Math.abs(viewport.scrollLeft-pos(i));
      if(d<dist){index=i;dist=d;}
    }
    return index;
  };
  const jumpTo=i=>{
    internal=true;
    const prior=viewport.style.scrollSnapType;
    viewport.style.scrollSnapType='none';
    viewport.scrollTo({left:pos(i),behavior:'instant'});
    requestAnimationFrame(()=>{
      viewport.style.scrollSnapType=prior;
      internal=false;
    });
  };
  const normalize=()=>{
    if(internal)return;
    const ix=current();
    if(ix<first)jumpTo(ix+n);
    else if(ix>last)jumpTo(ix-n);
  };
  const scheduleNormalize=()=>{
    clearTimeout(settling);
    settling=setTimeout(normalize,220);
  };
  const scrollToIndex=idx=>viewport.scrollTo({left:pos(idx),behavior:reduced.matches?'instant':'smooth'});
  // Initialize at real item #1 without revealing duplicated edge slides.
  jumpTo(first);
  // Preload offscreen work thumbnails so looping never exposes an empty card.
  track.querySelectorAll('.case-card__image img').forEach(img=>{ img.loading='eager'; });
  viewport.addEventListener('scroll',scheduleNormalize,{passive:true});
  if('onscrollend' in viewport)viewport.addEventListener('scrollend',normalize,{passive:true});
  const controls=viewport.parentElement.querySelectorAll('.related-work__arrow');
  controls.forEach(button=>button.addEventListener('click',()=>{
    const step=Number(button.dataset.direction);
    if(!step)return;
    const curr=current();
    scrollToIndex(Math.max(0,Math.min(all.length-1,curr+step)));
    scheduleNormalize();
  }));
  // Same-page anchors are owned by the original js/raboty-scroll.js.
  /* Local anchor fallback disabled here; the site scroll engine is the sole owner.
  // Local anchors only. Do not modify the actual Header or Footer links.
  document.querySelectorAll('a[href^="#"]').forEach(a=>a.addEventListener('click',e=>{
    const hash=a.getAttribute('href');
    if(!hash || hash==='#')return;
    const target=document.getElementById(hash.slice(1));
    if(!target)return;
    e.preventDefault();
    target.scrollIntoView({behavior:reduced.matches?'instant':'smooth'});
  }));
  */
})();

/* v20 source: detail-stage2-process.js */
/* Stage 02 v5 — scroll-proportional crossfade, with consistent reverse behavior.
 * Wellvia uses SCROLLING_IN_VIEW with IX2 smoothing 50. Here we sample scroll
 * continuously and use a damped approach to avoid snap-style thresholds.
 * No new scroll engine or library is loaded. */
(()=>{
 'use strict';
 const section=document.querySelector('.sc-case-process');
 if(!section)return;
 const steps=[...section.querySelectorAll('.sc-case-process__step')];
 const mq=window.matchMedia('(min-width:768px) and (prefers-reduced-motion:no-preference)');
 const data=steps.map(step=>({step,text:step.querySelector('.sc-case-process__text'),circle:step.querySelector('.sc-case-process__number-circle'),value:0}));
 const clamp=n=>Math.max(0,Math.min(1,n));
 const smooth=t=>{t=clamp(t);return t*t*(3-2*t)};
 let frame=0,enabled=false;
 function strength(rect,vh){
   // A broad activation/deactivation band is intentional: the previous
   // 10vh threshold was visually abrupt and unlike the sustained Wellvia scroll.
   const entering=smooth((vh*.72-rect.top)/(vh*.40));
   const leaving=smooth((rect.bottom-vh*.18)/(vh*.44));
   return Math.min(entering,leaving);
 }
 function render(d){
   if(d.text)d.text.style.opacity=(.4+.6*d.value).toFixed(4);
   if(d.circle){let n=Math.round(102-86*d.value);d.circle.style.backgroundColor=`rgb(${n},${n},${n})`}
 }
 function tick(){
   frame=0;if(!enabled)return;
   const vh=window.innerHeight;let unsettled=false;
   data.forEach(d=>{
      const target=strength(d.step.getBoundingClientRect(),vh);
      // Smooth in BOTH directions; converges without a stepped active class.
      const diff=target-d.value;
      d.value=Math.abs(diff)<.001?target:d.value+diff*.13;
      if(Math.abs(target-d.value)>.001)unsettled=true;
      render(d);
   });
   if(unsettled)request();
 }
 function request(){if(!frame&&enabled)frame=requestAnimationFrame(tick)}
 function updateMode(){
   cancelAnimationFrame(frame);frame=0;enabled=mq.matches;
   if(enabled){const vh=window.innerHeight;data.forEach(d=>{d.value=strength(d.step.getBoundingClientRect(),vh);render(d)});request()}
   else data.forEach(d=>{d.text?.style.removeProperty('opacity');d.circle?.style.removeProperty('background-color')});
 }
 window.addEventListener('scroll',request,{passive:true});
 window.addEventListener('resize',updateMode,{passive:true});
 mq.addEventListener?.('change',updateMode);
 updateMode();
})();

/* v20 source: detail-stage3-results.js */
/* Stage 03: subtle one-time reveals and screenshot viewer; no new scroll engine. */
(()=>{'use strict';
 const reduce=matchMedia('(prefers-reduced-motion:reduce)').matches;
 const els=[...document.querySelectorAll('.sc-case-reveal')];
 if(reduce||!('IntersectionObserver' in window)){els.forEach(el=>el.classList.add('is-visible'))}
 else{const ob=new IntersectionObserver(entries=>{entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('is-visible');ob.unobserve(e.target)}})},{rootMargin:'0px 0px -5% 0px',threshold:.09});els.forEach(e=>ob.observe(e))}
 const dialog=document.querySelector('#caseLightbox');if(!dialog)return;
 let opener=null;
 const pic=dialog.querySelector('.sc-case-lightbox__image');const cap=dialog.querySelector('.sc-case-lightbox__title');
 document.querySelectorAll('.sc-case-screens__open').forEach(btn=>btn.addEventListener('click',()=>{opener=btn;document.documentElement.classList.add('sc-dialog-open');pic.src=btn.dataset.full;pic.alt=btn.querySelector('img')?.alt||'';cap.textContent=btn.dataset.title||'';dialog.showModal();document.dispatchEvent(new CustomEvent('sc:dialog',{detail:{open:true}}));}));
 dialog.querySelector('.sc-case-lightbox__close').addEventListener('click',()=>dialog.close());
 dialog.addEventListener('keydown',event=>{if(event.key==='Tab'){event.preventDefault();dialog.querySelector('.sc-case-lightbox__close').focus()}});
 dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close()});
 dialog.addEventListener('close',()=>{pic.removeAttribute('src');document.documentElement.classList.remove('sc-dialog-open');opener?.focus({preventScroll:true});opener=null;document.dispatchEvent(new CustomEvent('sc:dialog',{detail:{open:false}}))});
})();
/* v20 source: detail-stage3-parallax-v10.js */
/* Beauty detail v10 · scroll-tied visual depth, one existing GSAP/Lenis owner.
   Animate only decorative layers and images inside fixed-size frames.
   Never animate the sticky process, the catalog case cards or the Footer.
*/
(()=>{
  'use strict';
  const story=document.querySelector('#case-story');
  if(!story || !window.gsap || !window.ScrollTrigger)return;
  gsap.registerPlugin(ScrollTrigger);
  const mm=gsap.matchMedia();
  mm.add('(min-width: 801px) and (prefers-reduced-motion: no-preference)',()=>{
    const make=(el,from,to,trigger,opts={})=>{
      if(!el)return;
      return gsap.fromTo(el,from,{
        ...to,
        ease:'none',
        scrollTrigger:{trigger, start:opts.start||'top bottom',end:opts.end||'bottom top',scrub:opts.scrub ?? 1.15,invalidateOnRefresh:true}
      });
    };
    const upper=story.querySelector('.sc-case-story__glow--upper');
    const lower=story.querySelector('.sc-case-story__glow--lower');
    make(upper,{y:-90},{y:125},story,{scrub:1.7});
    make(lower,{y:110},{y:-100},story,{scrub:1.9});
    const result=story.querySelector('.sc-case-result__hero');
    const resultImage=story.querySelector('.sc-case-result__hero-media img');
    make(resultImage,{yPercent:-2.3,scale:1.045},{yPercent:2.3,scale:1.045},result,{start:'top bottom',end:'bottom top',scrub:1.1});
    const items=[...story.querySelectorAll('.sc-case-screens__item')];
    items.forEach((item,i)=>{
      const img=item.querySelector('.sc-case-screens__open img');
      const drift=(i%2===0)?2.4:-2.4;
      make(img,{yPercent:-drift,scale:1.09},{yPercent:drift,scale:1.09},item,{scrub:1.05});
    });
    // Light entering motion belongs to containers, not the catalogue's cards.
    const other=story.querySelector('.related-work');
    const title=other?.querySelector('.related-work__head');
    const controls=other?.querySelector('.related-work__controls');
    if(title)make(title,{y:18,opacity:.85},{y:0,opacity:1},other,{start:'top 90%',end:'top 47%',scrub:.9});
    if(controls)make(controls,{y:12,opacity:.85},{y:0,opacity:1},controls,{start:'top 96%',end:'top 74%',scrub:.9});
    const onLoad=()=>ScrollTrigger.refresh();
    const images=[resultImage,...items.map(x=>x.querySelector('img'))].filter(Boolean);
    images.filter(x=>!x.complete).forEach(img=>img.addEventListener('load',onLoad,{once:true}));
    return ()=>{
      images.forEach(img=>img.removeEventListener('load',onLoad));
    };
  });
})();

/* v20 source: detail-stage4-refinement-v16.js */
/* v16 · subtle scroll depth, leveraging site's existing GSAP + ScrollTrigger.
   No new scroll engine, no new pin/sticky behavior. */
(()=>{
  'use strict';
  if(!window.gsap||!window.ScrollTrigger)return;
  const hero=document.querySelector('.works-page.sc-case-first-page .case-hero__media');
  const heading=document.querySelector('.sc-case-process__heading');
  if(!hero||!heading)return;
  gsap.registerPlugin(ScrollTrigger);
  const mm=gsap.matchMedia();
  mm.add('(min-width: 801px) and (prefers-reduced-motion: no-preference)',()=>{
    const figures=[...hero.querySelectorAll('.case-hero__figure')];
    const offsets=[[-8,12],[-11,18],[-6,10]];
    const animations=figures.map((figure,i)=>gsap.fromTo(figure,{y:offsets[i]?.[0]||-8},{y:offsets[i]?.[1]||14,ease:'none',scrollTrigger:{trigger:hero,start:'top bottom',end:'bottom top',scrub:1.2,invalidateOnRefresh:true}}));
    animations.push(gsap.fromTo(heading,{y:25,opacity:.88},{y:-10,opacity:1,ease:'none',scrollTrigger:{trigger:heading,start:'top 98%',end:'top 50%',scrub:1.1,invalidateOnRefresh:true}}));
    return()=>animations.forEach(x=>x.kill());
  });
})();
