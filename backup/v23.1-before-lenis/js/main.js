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
/* v23.1: animate ONE original image. No cloned media or image swaps.
   The placeholder is only a structural grid cell keeping the start position.
   ScrollTrigger owns the pin spacer when online; sticky is the offline fallback. */
(()=>{
  const scene=document.getElementById('top');
  const sticky=document.getElementById('imageScrollSticky');
  const hero=sticky.querySelector('.hero');
  const stage=hero.querySelector('.hero-stage');
  const photo=stage.querySelector('.photo');
  const home=photo.parentNode;
  const holder=document.createElement('div');
  holder.className='photo photo-position-holder';
  holder.setAttribute('aria-hidden','true');
  const reduced=matchMedia('(prefers-reduced-motion:reduce)');
  const mobile=matchMedia('(max-width:850px), (min-aspect-ratio:3/1)');
  const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
  const lerp=(a,b,t)=>a+(b-a)*t;
  const ease=t=>t*t*t*(t*(t*6-15)+10);
  const ink=[23,30,35], muted=[82,108,130], soft=[98,116,133], line=[168,186,201];
  const white=[245,249,252], whiteMuted=[220,229,237], whiteSoft=[203,214,223], whiteLine=[213,224,232];
  const mix=(a,b,t)=>a.map((v,i)=>Math.round(lerp(v,b[i],t))).join(',');
  const enabled=()=>!mobile.matches&&!reduced.matches;
  let mounted=false,controller=null,bounds=null,raf=0,pinDistance=0,usingGSAP=false;
  const totalDistance=()=>Math.max(620,Math.min(1500,innerHeight*1.04));

  function mountPhoto(){
    if(mounted)return;
    home.replaceChild(holder,photo);
    photo.classList.add('hero-image-expander');
    hero.appendChild(photo);
    mounted=true;
    bounds=null;
  }
  function restorePhoto(){
    if(!mounted)return;
    photo.classList.remove('hero-image-expander');
    photo.style.removeProperty('width');photo.style.removeProperty('height');
    photo.style.removeProperty('transform');photo.style.removeProperty('border-radius');
    photo.style.removeProperty('--photo-shade-opacity');
    photo.style.removeProperty('--photo-caption-opacity');
    photo.style.removeProperty('left');photo.style.removeProperty('top');
    holder.replaceWith(photo);
    mounted=false;bounds=null;
  }
  function measure(){
    const b=hero.getBoundingClientRect(), c=holder.getBoundingClientRect();
    if(!(b.width>0&&b.height>0&&c.width>0&&c.height>0))return null;
    return {x:c.left-b.left,y:c.top-b.top,w:c.width,h:c.height,
      ew:b.width,eh:b.height,r0:parseFloat(getComputedStyle(holder).borderTopLeftRadius)||25,
      r1:parseFloat(getComputedStyle(hero).borderTopLeftRadius)||30};
  }
  function clearColors(){
    ['--hero-strong','--hero-secondary','--hero-soft','--hero-line','--hero-shadow-alpha','--hero-accent']
      .forEach(k=>hero.style.removeProperty(k));
    sticky.classList.remove('is-image-animated');
  }
  function render(progress){
    if(!enabled()){clearColors();restorePhoto();return}
    if(!mounted)mountPhoto();
    if(!bounds)bounds=measure();
    if(!bounds)return;
    const b=bounds,t=ease(clamp(progress/0.995,0,1));
    photo.style.width=lerp(b.w,b.ew,t).toFixed(2)+'px';
    photo.style.height=lerp(b.h,b.eh,t).toFixed(2)+'px';
    photo.style.transform=`translate3d(${lerp(b.x,0,t).toFixed(2)}px,${lerp(b.y,0,t).toFixed(2)}px,0)`;
    photo.style.borderRadius=lerp(b.r0,b.r1,t).toFixed(2)+'px';
    const d=clamp((t-.08)/.70,0,1),sd=d*d*(3-2*d);
    photo.style.setProperty('--photo-shade-opacity',(sd*.98).toFixed(3));
    photo.style.setProperty('--photo-caption-opacity',(1-clamp((t-.34)/.3,0,1)).toFixed(3));
    const ct=clamp((t-.26)/.47,0,1),tone=ct*ct*(3-2*ct);
    hero.style.setProperty('--hero-strong',mix(ink,white,tone));
    hero.style.setProperty('--hero-secondary',mix(muted,whiteMuted,tone));
    hero.style.setProperty('--hero-soft',mix(soft,whiteSoft,tone));
    hero.style.setProperty('--hero-line',mix(line,whiteLine,tone));
    hero.style.setProperty('--hero-shadow-alpha',(0.015+tone*.45).toFixed(3));
    hero.style.setProperty('--hero-accent',`rgb(${mix([228,77,31],[255,150,112],tone*.68)})`);
    sticky.classList.add('is-image-animated');
    photo.dataset.progress=progress.toFixed(4);
  }
  function mountFallback(){
    usingGSAP=false;pinDistance=totalDistance();
    sticky.style.position='sticky';sticky.style.top='0';
    scene.style.height=(sticky.offsetHeight+pinDistance)+'px';
    function updateFrame(){raf=0;render(clamp(-scene.getBoundingClientRect().top/pinDistance,0,1))}
    function update(){if(!raf)raf=requestAnimationFrame(updateFrame)}
    addEventListener('scroll',update,{passive:true});
    controller={kill(){removeEventListener('scroll',update);cancelAnimationFrame(raf);raf=0;
      scene.style.height='';sticky.style.position='';sticky.style.top=''},
      refresh(){pinDistance=totalDistance();scene.style.height=(sticky.offsetHeight+pinDistance)+'px';bounds=null;update()},update};
    update();
  }
  function mountScrollTrigger(){
    usingGSAP=true;window.gsap.registerPlugin(window.ScrollTrigger);
    controller=window.ScrollTrigger.create({
      trigger:scene,pin:sticky,pinSpacing:true,start:'top top',
      end:()=>'+='+totalDistance(),scrub:true,anticipatePin:1,
      invalidateOnRefresh:true,
      onRefresh:()=>{bounds=null;render(controller?controller.progress:0)},
      onUpdate:self=>render(self.progress)
    });
    render(controller.progress);
  }
  function rebuild(){
    if(controller){controller.kill();controller=null}
    bounds=null;scene.style.height='';clearColors();
    if(!enabled()){
      sticky.style.position='';sticky.style.top='';restorePhoto();return;
    }
    mountPhoto();
    if(window.gsap&&window.ScrollTrigger)mountScrollTrigger();else mountFallback();
  }
  let resizeID=0;
  addEventListener('resize',()=>{clearTimeout(resizeID);resizeID=setTimeout(()=>{
    // The placeholder is the fixed layout reference. It retains grid dimensions.
    bounds=null;
    if(controller&&usingGSAP)window.ScrollTrigger.refresh();else rebuild();
  },120)},{passive:true});
  reduced.addEventListener?.('change',rebuild);
  mobile.addEventListener?.('change',rebuild);
  addEventListener('load',()=>{bounds=null;
    if(usingGSAP&&controller)window.ScrollTrigger.refresh();else controller?.refresh?.();
  },{once:true});
  rebuild();
  window.__synthecoreScrollQA={getEngine:()=>usingGSAP?'gsap-scrolltrigger':'native-pin-fallback',
    getProgress:()=>Number(photo.dataset.progress||0),getPinDistance:()=>pinDistance||totalDistance(),
    photoMounted:()=>mounted,
    refresh:()=>{bounds=null;if(usingGSAP)window.ScrollTrigger.refresh();else controller?.refresh?.()}};
})();
});
