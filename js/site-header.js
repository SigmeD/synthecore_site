/* Shared Header behavior extracted from current Git v60, including focus restoration. */
(()=>{
  const header=document.getElementById('floatingHeader');
  const toggle=document.getElementById('menuToggle');
  const panel=document.getElementById('mobilePanel');
  if(!header||!toggle||!panel||header.dataset.initialized)return;
  header.dataset.initialized='true';
  const onScroll=()=>header.classList.toggle('is-scrolled',scrollY>18);
  addEventListener('scroll',onScroll,{passive:true});onScroll();
  function closeMenu(){panel.hidden=true;toggle.setAttribute('aria-expanded','false');toggle.setAttribute('aria-label','Открыть меню')}
  toggle.addEventListener('click',()=>{const open=panel.hidden;panel.hidden=!open;toggle.setAttribute('aria-expanded',String(open));toggle.setAttribute('aria-label',open?'Закрыть меню':'Открыть меню')});
  panel.querySelectorAll('a').forEach(a=>a.addEventListener('click',closeMenu));
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!panel.hidden){const restore=panel.contains(document.activeElement);closeMenu();if(restore)toggle.focus({preventScroll:true})}});
  document.addEventListener('pointerdown',e=>{if(!header.contains(e.target))closeMenu()});
  addEventListener('resize',()=>{if(innerWidth>850)closeMenu()});
})();
