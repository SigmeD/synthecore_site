/* SyntheCore v47 process. Hover/focus/tap decoration only; no ScrollTrigger, Lenis or global scroll listeners. */
document.addEventListener('DOMContentLoaded',()=>{
  const section=document.querySelector('#process.sc-process');
  if(!section)return;
  const rail=section.querySelector('.sc-process__steps');
  const steps=[...section.querySelectorAll('.sc-process__step')];
  const buttons=steps.map(step=>step.querySelector('.sc-process__marker'));
  if(!rail||buttons.some(button=>!button))return;
  let chosen=-1;
  let temporary=-1;
  const setActive=(index)=>{
    rail.style.setProperty('--sc-process-progress',index<0?'0':String(index/Math.max(1,steps.length-1)));
    steps.forEach((step,i)=>{
      step.classList.toggle('is-active',index===i);
      step.classList.toggle('is-passed',index>i);
      buttons[i].setAttribute('aria-pressed',String(chosen===i));
    });
  };
  const paint=()=>setActive(temporary>=0?temporary:chosen);
  steps.forEach((step,index)=>{
    step.addEventListener('pointerenter',(event)=>{
      if(event.pointerType==='mouse'||event.pointerType==='pen'){temporary=index;paint();}
    });
    step.addEventListener('pointerleave',(event)=>{
      if(event.pointerType==='mouse'||event.pointerType==='pen'){temporary=-1;paint();}
    });
    buttons[index].addEventListener('focus',()=>{temporary=index;paint()});
    buttons[index].addEventListener('blur',()=>{temporary=-1;paint()});
    buttons[index].addEventListener('click',()=>{
      chosen=chosen===index?-1:index;
      paint();
    });
  });
  if('IntersectionObserver' in window){
    const observer=new IntersectionObserver((entries)=>{
      if(entries.some(entry=>entry.isIntersecting)){
        section.classList.add('sc-process--seen');
        observer.disconnect();
      }
    },{threshold:0.2});
    observer.observe(section);
  }

  // Only this illustration moves. A tiny scroll displacement makes it
  // rise as the banner enters the viewport; no GSAP/Lenis mutations or pins.
  const artLayer=section.querySelector('.sc-process__art-parallax');
  if(artLayer&&'matchMedia' in window){
    const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
    let visible=false;
    let frame=0;
    const updateLift=()=>{
      frame=0;
      if(reduced.matches){
        artLayer.style.removeProperty('--sc-process-scroll-lift');
        return;
      }
      if(!visible)return;
      const rect=section.getBoundingClientRect();
      const viewport=window.innerHeight||1;
      const progress=Math.max(0,Math.min(1,(viewport-rect.top)/(viewport+rect.height)));
      const lift=(0.5-progress)*20; // from +10px to -10px across section passage
      artLayer.style.setProperty('--sc-process-scroll-lift',lift.toFixed(2)+'px');
    };
    const scheduleLift=()=>{if(!frame)frame=requestAnimationFrame(updateLift)};
    if('IntersectionObserver' in window){
      const motionObserver=new IntersectionObserver((entries)=>{
        visible=!!entries[0]?.isIntersecting;
        scheduleLift();
      },{rootMargin:'20% 0px'});
      motionObserver.observe(section);
    }else{visible=true;}
    window.addEventListener('scroll',scheduleLift,{passive:true});
    window.addEventListener('resize',scheduleLift,{passive:true});
    if(reduced.addEventListener)reduced.addEventListener('change',scheduleLift);
    scheduleLift();
  }

  window.__synthecoreProcessQA={getState:()=>({active:temporary>=0?temporary:chosen,chosen,progress:rail.style.getPropertyValue('--sc-process-progress')||'0',steps:steps.length})};
});
