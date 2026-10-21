/* Roveia living wave background — ported from the source provided by the user.
   The source's three server-rendered wave layers are intentionally NOT duplicated:
   this controller owns generation of exactly three live layers.
   Footer text, navigation and layout remain those of SyntheCore v60.
*/
(function(){
  // CONFIG and geometry/motion functions preserved from the supplied reference.
  const CONFIG = {
    baseHeight: 200,
    baseHeightMobile: 250,
    color: (getComputedStyle(document.documentElement).getPropertyValue('--rwb-color') || '#218AFF').trim(),
    refWidth: 1440,
    points: 8,
    layers: [
      { wave: 400, opacity: 0.60, speed: 0.50, blurMul: 1.2, seed: 11 },
      { wave: 300, opacity: 0.75, speed: 0.60, blurMul: 1.0, seed: 29 },
      { wave: 150, amp: 80, opacity: 1.00, speed: 0.70, blurMul: 0.8, seed: 53 },
    ],
  };
  const root=document.getElementById('roveiaWaveBg');
  if(!root||root.dataset.initialized)return;
  root.dataset.initialized='true';
  const reduce=window.matchMedia('(prefers-reduced-motion:reduce)');
  const W=CONFIG.refWidth, MARGIN=W*0.18, TAU=Math.PI*2;
  const xs=[];
  for(let i=0;i<=CONFIG.points;i++)xs.push(-MARGIN+i*((W+2*MARGIN)/CONFIG.points));
  function makeRng(seed){let s=seed>>>0;return ()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296;};}
  const SVGNS='http://www.w3.org/2000/svg';
  const layers=CONFIG.layers.map((cfg,idx)=>{
    const rnd=makeRng(cfg.seed||(idx+1)*7919);
    const pts=xs.map(()=>({p1:rnd()*TAU,p2:rnd()*TAU,f1:0.8+rnd()*0.4,f2:0.8+rnd()*0.4}));
    const div=document.createElement('div');
    div.className='rwb-layer';
    div.style.setProperty('--m',cfg.blurMul);
    div.style.opacity=cfg.opacity;
    const svg=document.createElementNS(SVGNS,'svg');
    svg.setAttribute('preserveAspectRatio','none');
    const gradId='rwbGrad'+idx;
    svg.innerHTML=`<defs><linearGradient id="${gradId}" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="0">
       <stop offset="0" stop-color="${CONFIG.color}" stop-opacity="var(--rwb-fill,0.5)"/>
       <stop offset="1" stop-color="${CONFIG.color}" stop-opacity="0"/>
       </linearGradient></defs><path fill="url(#${gradId})"></path>`;
    div.appendChild(svg);
    root.appendChild(div);
    return {cfg,pts,div,svg,grad:svg.querySelector('linearGradient'),path:svg.querySelector('path'),totalH:0,mean:0,amp:0};
  });
  function layout(){
    const base=(window.innerWidth<=600?CONFIG.baseHeightMobile:CONFIG.baseHeight);
    for(const L of layers){
      const total=base+L.cfg.wave;
      L.totalH=total;
      L.mean=L.cfg.wave*0.5;
      L.amp=(L.cfg.amp!=null?L.cfg.amp:L.cfg.wave*0.45);
      L.div.style.height=total+'px';
      L.svg.setAttribute('viewBox',`0 0 ${W} ${total}`);
      L.grad.setAttribute('y2',total);
    }
  }
  function buildPath(ys,totalH){
    let d=`M ${xs[0].toFixed(1)} ${ys[0].toFixed(1)}`;
    for(let i=0;i<xs.length-1;i++){
      const x0=xs[i-1]??xs[i],y0=ys[i-1]??ys[i];
      const x1=xs[i],y1=ys[i];
      const x2=xs[i+1],y2=ys[i+1];
      const x3=xs[i+2]??x2,y3=ys[i+2]??y2;
      const c1x=x1+(x2-x0)/6,c1y=y1+(y2-y0)/6;
      const c2x=x2-(x3-x1)/6,c2y=y2-(y3-y1)/6;
      d+=` C ${c1x.toFixed(1)} ${c1y.toFixed(1)} ${c2x.toFixed(1)} ${c2y.toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}`;
    }
    d+=` L ${xs[xs.length-1].toFixed(1)} ${totalH} L ${xs[0].toFixed(1)} ${totalH} Z`;
    return d;
  }
  function frame(t){
    for(const L of layers){
      const sp=L.cfg.speed;
      const ys=L.pts.map(pt=>{
        const a=Math.sin(t*sp*pt.f1+pt.p1);
        const b=Math.sin(t*sp*1.62*pt.f2+pt.p2);
        return L.mean+L.amp*(0.62*a+0.38*b);
      });
      L.path.setAttribute('d',buildPath(ys,L.totalH));
    }
  }
  layout();
  window.addEventListener('resize',layout);
  frame(0);
  let running=false,raf=0,visible=!('IntersectionObserver' in window);
  function loop(now){frame(now/1000);raf=requestAnimationFrame(loop);}
  function start(){if(!running&&visible&&!reduce.matches&&!document.hidden){running=true;raf=requestAnimationFrame(loop);}}
  function stop(){running=false;cancelAnimationFrame(raf);}
  if('IntersectionObserver' in window){
    new IntersectionObserver(([e])=>{visible=e.isIntersecting;visible?start():stop();},{threshold:0}).observe(root);
  }else{start();}
  document.addEventListener('visibilitychange',()=>document.hidden?stop():start());
  reduce.addEventListener?.('change',()=>{if(reduce.matches){stop();frame(0);}else start();});
})();
