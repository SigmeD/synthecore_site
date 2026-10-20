/* Shared CTA/footer reveal — event triggers from v12, no dependency on a works page. */
(() => {
  const root = document.querySelector('.contact-footer.sc-footer');
  if (!root || root.dataset.revealInitialized) return;
  root.dataset.revealInitialized='true';
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
  if(reduced.matches)return;
  const targets = root.querySelectorAll('.sc-footer__intro, .sc-footer__bottom, .sc-footer__fine');
  if (!('IntersectionObserver' in window)) return;
  targets.forEach(item => item.classList.add(
    item.classList.contains('sc-footer__intro') ? 'sc12-cta-enter-pending' : 'sc5-enter-pending'
  ));
  const reveal = entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.add(
        entry.target.classList.contains('sc-footer__intro') ? 'sc12-cta-enter-visible' : 'sc5-enter-visible'
      );
      observer.unobserve(entry.target);
      edgeObserver.unobserve(entry.target);
    }
  };
  const observer = new IntersectionObserver(reveal, {threshold:0.01, rootMargin:'0px 0px -7% 0px'});
  // At document end the mobile fine print cannot cross the original -7% margin.
  // Keep the CTA/bottom triggers and all timings; let the final line reveal in view.
  const edgeObserver = new IntersectionObserver(reveal, {threshold:0.01});
  targets.forEach(item => (item.classList.contains('sc-footer__fine')?edgeObserver:observer).observe(item));
  reduced.addEventListener?.('change',()=>{
    if(!reduced.matches)return;
    targets.forEach(item=>item.classList.add(item.classList.contains('sc-footer__intro')?'sc12-cta-enter-visible':'sc5-enter-visible'));
    observer.disconnect();
    edgeObserver.disconnect();
  });
})();
