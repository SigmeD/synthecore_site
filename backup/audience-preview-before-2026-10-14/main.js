document.addEventListener("DOMContentLoaded",()=>{
(()=>{
  const header=document.getElementById('floatingHeader');
  const toggle=document.getElementById('menuToggle');
  const panel=document.getElementById('mobilePanel');
  const onScroll=()=>header.classList.toggle('is-scrolled',scrollY>18);
  addEventListener('scroll',onScroll,{passive:true});onScroll();
  function closeMenu(){panel.hidden=true;toggle.setAttribute('aria-expanded','false');toggle.setAttribute('aria-label','Открыть меню')}
  toggle.addEventListener('click',()=>{const open=panel.hidden;panel.hidden=!open;toggle.setAttribute('aria-expanded',String(open));toggle.setAttribute('aria-label',open?'Закрыть меню':'Открыть меню')});
  panel.querySelectorAll('a').forEach(a=>a.addEventListener('click',closeMenu));
  document.addEventListener('keydown',e=>{if(e.key==='Escape')closeMenu()});
  document.addEventListener('pointerdown',e=>{if(!header.contains(e.target))closeMenu()});
  addEventListener('resize',()=>{if(innerWidth>850)closeMenu()});
})();

    (()=>{
      const section=document.getElementById('audiences');
      const options=[...section.querySelectorAll('.audience-option')];
      const panels=[...section.querySelectorAll('.audience-card')];
      const visual=section.querySelector('.audience-visual');
      const shell=section.querySelector('.audience-card-shell');
      const reduced=matchMedia('(prefers-reduced-motion: reduce)');
      const touchOnly=matchMedia('(hover: none)');
      const compact=matchMedia('(max-width:850px)');
      const gsap=window.gsap;
      let activeIndex=null;
      let deckTimeline=null;
      let manualScroll=null;

      function renderDeck(previous,animate){
        deckTimeline?.kill();
        deckTimeline=null;
        const style=getComputedStyle(shell);
        const stepX=parseFloat(style.getPropertyValue('--deck-step-x'));
        const stepY=parseFloat(style.getPropertyValue('--deck-step-y'));
        const positions=panels.map((panel,i)=>{
          const depth=(i-activeIndex+panels.length)%panels.length;
          panel.dataset.depth=String(depth);
          panel.style.setProperty('--deck-depth',depth);
          return {x:depth*stepX,y:depth*stepY,zIndex:panels.length-depth};
        });
        const showFront=()=>panels.forEach((panel,i)=>panel.classList.toggle('is-front',i===activeIndex));
        if(!gsap){showFront();return;} // CSS positions remain usable without libraries.
        if(!animate||reduced.matches||previous===null){
          showFront();
          panels.forEach((panel,i)=>gsap.set(panel,positions[i]));
          return;
        }
        // Move the former front card aside before exchanging layers. Never rotate
        // or restart transforms from zero: interrupted changes keep their position.
        const outgoing=panels.find(panel=>panel.classList.contains('is-front'))||panels[previous];
        deckTimeline=gsap.timeline({defaults:{ease:'power2.inOut'},onComplete:()=>{deckTimeline=null;}});
        deckTimeline.to(outgoing,{x:-22,y:-14,duration:.2},0);
        deckTimeline.call(showFront,[],.2);
        panels.forEach((panel,i)=>{
          deckTimeline.set(panel,{zIndex:positions[i].zIndex},.2);
          deckTimeline.to(panel,{x:positions[i].x,y:positions[i].y,duration:.46},.2);
        });
      }

      function selectAudience(index,source='hover',animate=true){
        if(!Number.isInteger(index)||index<0||index>=options.length) return;
        if(source!=='scroll'&&source!=='initial') manualScroll=scrollY;
        if(index===activeIndex) return;
        const previous=activeIndex;
        const active=index;
        activeIndex=active;
        visual.classList.add('is-open');
        options.forEach((button,i)=>{
          const selected=i===active;
          button.classList.toggle('is-active',selected);
          button.setAttribute('aria-pressed',String(selected));
        });
        panels.forEach((panel,i)=>{
          const selected=i===active;
          panel.classList.toggle('is-active',selected);
          panel.setAttribute('aria-hidden',String(!selected));
          panel.inert=!selected;
        });
        renderDeck(previous,animate);
      }
      // Do not activate merely because a scrolling row passes under a stationary pointer.
      // Actual pointer movement, focus, or a tap is required.
      options.forEach((button,index)=>{
        button.addEventListener('pointermove',e=>{
          if ((e.pointerType==='mouse'||e.pointerType==='pen') && !touchOnly.matches) {
            selectAudience(index,'hover');
          }
        },{passive:true});
        button.addEventListener('focus',()=>{
          // Pointer focus is not an intentional card reveal; keyboard focus is.
          if(button.matches(':focus-visible')) selectAudience(index,'focus');
        });
        button.addEventListener('click',e=>{
          selectAudience(index,e.detail===0?'focus':'click');
        });
        button.addEventListener('keydown',e=>{
          if(e.key==='Escape') {button.blur();manualScroll=null;}
          if(['ArrowDown','ArrowUp','Home','End'].includes(e.key)){
            e.preventDefault();
            const next=e.key==='Home'?0:e.key==='End'?options.length-1:
              (index+(e.key==='ArrowDown'?1:options.length-1))%options.length;
            options[next].focus({preventScroll:true});
            selectAudience(next,'focus');
          }
        });
      });
      selectAudience(0,'initial',false);
      const settle=()=>renderDeck(null,false);
      reduced.addEventListener('change',settle);
      compact.addEventListener('change',settle);

      if(gsap&&window.ScrollTrigger){
        // Observe the existing Lenis/ScrollTrigger stream. No pin, snap, wheel
        // handler, second Lenis instance, or additional ticker is introduced.
        window.ScrollTrigger.create({
          id:'synthecore-audiences',trigger:section,start:'top 55%',end:'bottom 55%',
          onUpdate:self=>{
            if(!self.isActive||section.querySelector('.audience-option:focus-visible')) return;
            if(manualScroll!==null&&Math.abs(scrollY-manualScroll)<48) return;
            manualScroll=null;
            selectAudience(Math.min(options.length-1,Math.floor(self.progress*options.length)),'scroll');
          },
        });
      }
    })();
});
