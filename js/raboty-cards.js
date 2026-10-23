/* SyntheCore v18: dialog content uses the rendered, semantic card as its only data source. */
(() => {
  const modal=document.getElementById('caseDialog');
  if(!modal) return;
  const closeButton=modal.querySelector('.case-dialog__close');
  const backButton=modal.querySelector('.case-dialog__back');
  const modalTitle=document.getElementById('dialogTitle');
  const modalType=document.getElementById('dialogType');
  const modalDescription=document.getElementById('dialogDescription');
  const modalImage=document.getElementById('dialogImage');
  let opener=null;
  for(const button of document.querySelectorAll('button.case-card__open')) {
    button.addEventListener('click', () => {
      const card=button.closest('.case-card');
      if(!card) return;
      const name=card.querySelector('.case-card__body h2')?.textContent?.trim();
      const description=card.querySelector('.case-card__body p')?.textContent?.trim();
      const type=card.querySelector('.case-card__tags .tag')?.textContent?.trim();
      const image=card.querySelector('.case-card__image img');
      if(!name || !description || !image) return;
      opener=button;
      modalTitle.textContent=name;
      modalType.textContent=type || '';
      modalDescription.textContent=description;
      modalImage.src=image.currentSrc || image.src;
      modalImage.alt=image.alt;
      modal.showModal();
      document.documentElement.classList.add('sc-dialog-open');
      document.dispatchEvent(new CustomEvent('sc:dialog',{detail:{open:true}}));
    });
  }
  const close=()=>modal.close();
  closeButton.addEventListener('click',close);
  backButton.addEventListener('click',close);
  modal.addEventListener('click',e=>{if(e.target===modal)close();});
  modal.addEventListener('close',()=>{
    document.documentElement.classList.remove('sc-dialog-open');
    document.dispatchEvent(new CustomEvent('sc:dialog',{detail:{open:false}}));
    opener?.focus({preventScroll:true});opener=null;
  });
})();
