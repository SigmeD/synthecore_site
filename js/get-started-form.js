/* /get-started/ prototype: validates the briefing, prepares mailto fallback with required international phone.
 * No server endpoint exists: NEVER claim delivery and never clear user input. */
(()=>{
  'use strict';
  const form=document.getElementById('projectRequestForm');
  if(!form)return;
  const status=document.getElementById('scSubmitStatus');
  const fallback=document.getElementById('scMailtoFallback');
  const ids={name:'scClientName',contact:'scContact',phone:'scPhone',task:'scTask',url:'scProjectUrl',consent:'scDataConsent'};
  const errors={name:'scNameError',contact:'scContactError',phone:'scPhoneError',task:'scTaskError',url:'scUrlError',consent:'scConsentError'};
  const fields=Object.fromEntries(Object.entries(ids).map(([key,id])=>[key,document.getElementById(id)]));
  const isEmail=s=>/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s);
  const isTelegram=s=>/^@[A-Za-z0-9_]{5,32}$/.test(s)||/^https?:\/\/(?:www\.)?(?:t\.me|telegram\.me)\/[A-Za-z0-9_]{5,32}\/?$/i.test(s);
  const validUrl=s=>{try{const u=new URL(s);return ['https:','http:'].includes(u.protocol)&&!!u.hostname.includes('.');}catch{return false;}};
  function message(key){
    const value=key==='consent'?'':fields[key].value.trim();
    if(key==='name')return !value?'Укажите имя.':value.length<2?'Имя должно содержать хотя бы 2 символа.':'';
    if(key==='contact')return !value?'Оставьте email или Telegram.':!isEmail(value)&&!isTelegram(value)?'Укажите email или Telegram в формате @username.':'';
    if(key==='phone')return !value?'Укажите номер телефона.':!window.scPhone?.valid()?`Проверьте номер: ${window.scPhone?.requiredDigits()||'нужное количество'} цифр для выбранной страны.`:'';
    if(key==='consent')return fields.consent.checked?'':'Подтвердите согласие на обработку данных.';
    if(key==='task')return !value?'Коротко опишите задачу.':value.length<15?'Нужно хотя бы 15 символов, чтобы понять задачу.':'';
    if(key==='url')return value&&!validUrl(value)?'Укажите ссылку с https:// или оставьте поле пустым.':'';
    return '';
  }
  function validate(key){
    const error=message(key);
    const el=fields[key];
    document.getElementById(errors[key]).textContent=error;
    el.classList.toggle('is-invalid',!!error);
    if(key==='phone')document.getElementById('scPhoneGroup')?.classList.toggle('is-invalid',!!error);
    if(error)el.setAttribute('aria-invalid','true');else el.removeAttribute('aria-invalid');
    return !error;
  }
  let touched=new Set();
  Object.entries(fields).forEach(([key,field])=>{
    if(key!=='consent')field.addEventListener('blur',()=>{touched.add(key);validate(key);});
    field.addEventListener(key==='consent'?'change':'input',()=>{status.hidden=true;if(touched.has(key))validate(key);});
  });
  form.addEventListener('submit',event=>{
    event.preventDefault();
    const invalid=Object.keys(fields).filter(key=>{touched.add(key);return !validate(key);});
    if(invalid.length){status.hidden=true;fields[invalid[0]].focus();return;}
    const name=fields.name.value.trim();
    const contact=fields.contact.value.trim();
    const phone=window.scPhone?.getE164() || document.getElementById('scPhoneE164')?.value || '';
    const task=fields.task.value.trim();
    const url=fields.url.value.trim();
    const subject=`SyntheCore — новая задача от ${name}`;
    const body=`Имя: ${name}\nКонтакт: ${contact}\nТелефон: ${phone}\n\nЗадача:\n${task}${url?`\n\nСсылка на проект: ${url}`:''}`;
    fallback.href=`mailto:max.eroxin@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    status.hidden=false;
    status.scrollIntoView({block:'nearest',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
  });
})();
