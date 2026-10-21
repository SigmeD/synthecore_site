/* Works v22: reuse v60 Lenis parameters, without invoking hero-scroll.js
   (which expects the homepage's #imageScrollSticky and pins its hero).
   Keep the footer waves owned by the approved v12 component.
*/
(() => {
  'use strict';
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  let lenis = null;
  let ticker = null;
  let observer = null;
  let pendingAnchor = null;
  const cards = [...document.querySelectorAll('.case-grid .case-card__open')];
  const state = { engine:'native', revealed:0, total:cards.length };

  function setupReveals() {
    observer?.disconnect();
    observer = null;
    cards.forEach(card => {
      card.classList.remove('sc22-reveal-pending','sc22-reveal-visible');
      card.style.removeProperty('--works-reveal-delay');
    });
    if (reduced.matches || !('IntersectionObserver' in window)) {
      state.revealed = cards.length;
      return;
    }
    let revealed = new Set();
    cards.forEach((card,i) => {
      card.classList.add('sc22-reveal-pending');
      // A subtle stagger per row, not an arbitrary delay for off-screen items.
      card.style.setProperty('--works-reveal-delay', (i % 3) * 65 + 'ms');
    });
    observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add('sc22-reveal-visible');
        observer.unobserve(entry.target);
        revealed.add(entry.target);
        state.revealed = revealed.size;
      }
    }, {threshold:0.08, rootMargin:'0px 0px -6% 0px'});
    cards.forEach(card => observer.observe(card));
  }

  function focusAnchor() {
    if(!pendingAnchor)return;
    const target=pendingAnchor;
    pendingAnchor=null;
    const previous=target.getAttribute('tabindex');
    if(previous===null)target.setAttribute('tabindex','-1');
    target.focus({preventScroll:true});
    target.addEventListener('blur',()=>{
      if(previous===null)target.removeAttribute('tabindex');
      else target.setAttribute('tabindex',previous);
    },{once:true});
  }
  function smoothAnchorClick(event) {
    if (!lenis || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const anchor = event.target.closest?.('a[href]');
    if (!anchor || anchor.hasAttribute('download') || (anchor.target && anchor.target !== '_self')) return;
    let url;
    try { url = new URL(anchor.href); } catch { return; }
    if (url.origin !== location.origin || url.pathname !== location.pathname || url.search !== location.search || !url.hash) return;
    let target;
    try { target = document.getElementById(decodeURIComponent(url.hash.slice(1))); } catch { return; }
    if (!target) return;
    event.preventDefault();
    pendingAnchor=target;
    if (location.hash !== url.hash) history.pushState(null,'',url.hash);
    lenis.scrollTo(target,{onComplete:focusAnchor});
  }
  function stopLenis() {
    pendingAnchor=null;
    if (!lenis) return;
    if (ticker && window.gsap) window.gsap.ticker.remove(ticker);
    else if (ticker) ticker();
    lenis.destroy();
    lenis=null;
    ticker=null;
    state.engine='native';
  }
  function startLenis() {
    if (reduced.matches || lenis || !window.Lenis) return;
    // Identical wheel tuning to v60. No second engine / window wheel handler.
    lenis=new window.Lenis({duration:1.2,lerp:0,smoothWheel:true,
      syncTouch:false,anchors:false,autoRaf:false});
    if (window.gsap?.ticker) {
      ticker = time => lenis?.raf(time * 1000);
      window.gsap.ticker.add(ticker);
      window.gsap.ticker.lagSmoothing(0);
      state.engine='lenis-gsap';
    } else {
      // Fallback for environments where GSAP cannot be loaded.
      let active=true;
      const frame=time=>{ if (!active || !lenis) return; lenis.raf(time); requestAnimationFrame(frame); };
      requestAnimationFrame(frame);
      ticker=()=>{active=false;};
      state.engine='lenis-raf';
    }
    if (window.ScrollTrigger) {
      window.gsap?.registerPlugin?.(window.ScrollTrigger);
      lenis.on('scroll',window.ScrollTrigger.update);
    }
    if(document.querySelector('#caseDialog[open]'))lenis.stop();
  }
  function changePreference(){
    if (reduced.matches) stopLenis();
    else startLenis();
    setupReveals();
  }
  document.addEventListener('click',smoothAnchorClick,true);
  document.addEventListener('sc:dialog',event=>{
    if(!lenis)return;
    if(event.detail.open)lenis.stop();
    else if(!reduced.matches)lenis.start();
  });
  // Keyboard scrolling stays native; interrupt inertia to avoid counteracting it.
  document.addEventListener('keydown',event=>{
    if (!lenis || event.defaultPrevented || !['ArrowDown','ArrowUp','PageDown','PageUp','Home','End',' '].includes(event.key)) return;
    if (event.target.closest?.('input,textarea,select,[contenteditable],button,[role="dialog"]')) return;
    pendingAnchor=null;
    lenis.scrollTo(window.scrollY,{immediate:true,force:true});
  });
  reduced.addEventListener?.('change',changePreference);
  setupReveals();
  startLenis();
  window.__synthecoreWorksScrollQA={
    getState:()=>({ ...state, duration:lenis?.options.duration ?? null,
      targetScroll:lenis?.targetScroll ?? null, scroll:window.scrollY,
      pending:document.querySelectorAll('.sc22-reveal-pending:not(.sc22-reveal-visible)').length })
  };
})();
