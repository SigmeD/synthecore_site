/* Local CTA destinations; the existing raboty-scroll.js remains the scroll owner. */
(() => {
  'use strict';
  const request=document.querySelector('body.sc-get-started #request');
  if(!request&&!document.body.classList.contains('sc-privacy-page'))return;
  document.querySelectorAll('#floatingHeader a[href="/get-started/"], #contact a[href="/get-started/"]').forEach(anchor=>{
    anchor.setAttribute('href',request?'#request':'/get-started/#request');
    if(!request)return;
    anchor.addEventListener('click',event=>{
      // Normal motion is handled in capture phase by the shared Lenis owner.
      if(event.defaultPrevented||event.button!==0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;
      event.preventDefault();
      request.scrollIntoView({behavior:'instant',block:'start'});
      history.replaceState(null,'','#request');
      document.getElementById('scClientName')?.focus({preventScroll:true});
    });
  });
})();
