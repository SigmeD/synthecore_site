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
      const reduced=matchMedia('(prefers-reduced-motion: reduce)');
      const touchOnly=matchMedia('(hover: none)');
      let activeIndex=null;
      let activationSource=null;
      function selectAudience(index, source='hover'){
        const active=Number.isInteger(index) && index>=0 && index<options.length ? index : null;
        if (active===activeIndex && source===activationSource) return;
        activeIndex=active;
        activationSource=active===null?null:source;
        visual.classList.toggle('is-open',active!==null);
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
      }
      // Do not activate merely because a scrolling row passes under a stationary pointer.
      // Actual pointer movement, focus, or a tap is required.
      options.forEach((button,index)=>{
        button.addEventListener('pointermove',e=>{
          if ((e.pointerType==='mouse'||e.pointerType==='pen') && !touchOnly.matches) {
            selectAudience(index,'hover');
          }
        },{passive:true});
        button.addEventListener('pointerleave',e=>{
          if ((e.pointerType==='mouse'||e.pointerType==='pen') && activationSource==='hover' && activeIndex===index) {
            selectAudience(null);
          }
        });
        button.addEventListener('focus',()=>{
          // Pointer focus is not an intentional card reveal; keyboard focus is.
          if(button.matches(':focus-visible')) selectAudience(index,'focus');
        });
        button.addEventListener('blur',()=>{
          if(activationSource==='focus' && activeIndex===index) selectAudience(null);
        });
        button.addEventListener('click',e=>{
          // Mouse cursor state is governed by hover (above). Mobile gets tap-to-toggle.
          if(touchOnly.matches){
            selectAudience(activeIndex===index?null:index,'tap');
          } else if(e.detail===0){
            selectAudience(index,'focus');
          }
        });
        button.addEventListener('keydown',e=>{
          if(e.key==='Escape') {selectAudience(null);button.blur();}
          if(e.key==='ArrowDown'||e.key==='ArrowUp'){
            e.preventDefault();
            options[(index+(e.key==='ArrowDown'?1:options.length-1))%options.length].focus();
          }
        });
      });
      section.addEventListener('pointerleave',()=>{
        if(activationSource==='hover') selectAudience(null);
      });
      document.addEventListener('pointerdown',e=>{
        if(touchOnly.matches && !section.contains(e.target)) selectAudience(null);
      });
      selectAudience(null);


    })();
});
