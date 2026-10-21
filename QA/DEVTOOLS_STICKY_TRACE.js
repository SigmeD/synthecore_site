/* Paste this entire file in DevTools Console on the SyntheCore test page.
   Inspect its report after scrolling. It does not mutate layout or scroll. */
(() => {
  window.SCT_TRACE?.stop?.();
  const selectors = {
    hero: '#imageScrollSticky',
    works: '.sc-works-stack',
    services: '.sc-services__scene'
  };
  const log = [];
  let raf = 0;
  let lastY = window.scrollY;
  let lastT = performance.now();
  const capture = now => {
    const scroll = window.scrollY;
    const dt = Math.max(1, now - lastT);
    const row = {
      time: Math.round(now), scroll: Math.round(scroll),
      scrollDelta: +(scroll - lastY).toFixed(2),
      speedPxPerSecond: Math.round((scroll - lastY) * 1000 / dt),
      heroTop: Math.round(document.querySelector(selectors.hero)?.getBoundingClientRect().top ?? NaN),
      worksTop: Math.round(document.querySelector(selectors.works)?.getBoundingClientRect().top ?? NaN),
      servicesTop: Math.round(document.querySelector(selectors.services)?.getBoundingClientRect().top ?? NaN),
      worksProgress: +(window.ScrollTrigger?.getById('sc-works-timeline')?.progress ?? 0).toFixed(4),
      servicesProgress: +(window.ScrollTrigger?.getById('sc-services-pin')?.progress ?? 0).toFixed(4),
      pinCount: window.ScrollTrigger?.getAll()?.filter(t => Boolean(t.vars.pin)).length ?? -1
    };
    if (log.length < 3600) log.push(row);
    lastY = scroll;
    lastT = now;
    raf = requestAnimationFrame(capture);
  };
  window.SCT_TRACE = {
    stop() { cancelAnimationFrame(raf); raf = 0; console.log('SCT_TRACE stopped. Use SCT_TRACE.report()'); },
    report() {
      const max = [...log].sort((a, b) => Math.abs(b.scrollDelta) - Math.abs(a.scrollDelta)).slice(0, 12);
      console.table(max);
      console.log('Total recorded frames:', log.length);
      console.log('GSAP triggers:', window.ScrollTrigger?.getAll()?.map(t => ({id:t.vars.id,start:t.start,end:t.end,pin:!!t.vars.pin})));
      return log;
    },
    get samples() { return log; }
  };
  raf = requestAnimationFrame(capture);
  console.log('SCT_TRACE started. Scroll through section boundaries; then run SCT_TRACE.stop(); SCT_TRACE.report().');
})();
