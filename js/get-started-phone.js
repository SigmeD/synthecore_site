/* /get-started/ v4.9.2 — standalone country selector and national phone masks.
 * Country masks are UI aids and digit-count checks, not carrier-number verification.
 * No third-party code, external requests, geolocation or phone-number uploads. */
(() => {
  'use strict';
  const input = document.getElementById('scPhone');
  const select = document.getElementById('scPhoneCountry');
  const visual = document.getElementById('scPhoneCountryDisplay');
  const normalized = document.getElementById('scPhoneE164');
  if (!input || !select || !visual || !normalized) return;
  // ISO | Country | calling code | digits grouped with X | minimum | maximum | sample
  const rows = [
    ['BY','Беларусь','375','XX XXX-XX-XX',9,9,'29 123-45-67'],
    ['RU','Россия','7','(XXX) XXX-XX-XX',10,10,'(999) 123-45-67'],
    ['KZ','Казахстан','7','(XXX) XXX-XX-XX',10,10,'(701) 123-45-67'],
    ['EE','Эстония','372','XXXX XXXX',7,8,'5123 4567'],
    ['UZ','Узбекистан','998','XX XXX-XX-XX',9,9,'90 123-45-67'],
    ['AM','Армения','374','XX XXX XXX',8,8,'91 123 456'],
    ['GE','Грузия','995','XXX XX XX XX',9,9,'599 12 34 56'],
    ['LV','Латвия','371','XXXX XXXX',8,8,'2123 4567'],
    ['LT','Литва','370','XXX XXXXX',8,8,'612 34567'],
    ['KG','Кыргызстан','996','XXX XXX XXX',9,9,'700 123 456'],
    ['AZ','Азербайджан','994','XX XXX XX XX',9,9,'50 123 45 67'],
    ['MD','Молдова','373','XX XXX XXX',8,8,'69 123 456'],
    ['UA','Украина','380','XX XXX XX XX',9,9,'67 123 45 67'],
    ['AE','ОАЭ','971','XX XXX XXXX',9,9,'50 123 4567'],
    ['US','США','1','(XXX) XXX-XXXX',10,10,'(202) 555-0123'],
    ['CA','Канада','1','(XXX) XXX-XXXX',10,10,'(416) 555-0123'],
    ['GB','Великобритания','44','XXXX XXXXXX',9,10,'7700 900123'],
    ['DE','Германия','49','XXX XXXX XXXX',7,12,'151 2345 6789'],
    ['PL','Польша','48','XXX XXX XXX',9,9,'501 234 567'],
    ['FR','Франция','33','X XX XX XX XX',9,9,'6 12 34 56 78'],
    ['IT','Италия','39','XXX XXX XXXX',9,11,'312 345 6789'],
    ['ES','Испания','34','XXX XXX XXX',9,9,'612 345 678'],
    ['NL','Нидерланды','31','X XXXX XXXX',9,9,'6 1234 5678'],
    ['TR','Турция','90','(XXX) XXX XX XX',10,10,'(532) 123 45 67'],
    ['CZ','Чехия','420','XXX XXX XXX',9,9,'601 234 567'],
    ['PT','Португалия','351','XXX XXX XXX',9,9,'912 345 678'],
    ['FI','Финляндия','358','XX XXX XXXX',7,11,'40 123 4567'],
    ['SE','Швеция','46','XX XXX XX XX',7,10,'70 123 45 67'],
    ['NO','Норвегия','47','XXX XX XXX',8,8,'412 34 567'],
    ['CH','Швейцария','41','XX XXX XX XX',9,9,'79 123 45 67'],
    ['IE','Ирландия','353','XX XXX XXXX',9,9,'87 123 4567'],
    ['RS','Сербия','381','XX XXX XXXX',8,10,'64 123 4567'],
    ['HU','Венгрия','36','XX XXX XXXX',9,9,'20 123 4567'],
    ['RO','Румыния','40','XXX XXX XXX',9,9,'721 234 567'],
    ['AT','Австрия','43','XXX XXX XXXX',7,12,'660 123 4567'],
    ['IL','Израиль','972','XX XXX XXXX',8,9,'50 123 4567'],
    ['IN','Индия','91','XXXXX XXXXX',10,10,'98765 43210'],
    ['SG','Сингапур','65','XXXX XXXX',8,8,'8123 4567'],
    ['JP','Япония','81','XX XXXX XXXX',9,10,'90 1234 5678'],
    ['KR','Южная Корея','82','XX XXXX XXXX',9,10,'10 1234 5678'],
    ['CN','Китай','86','XXX XXXX XXXX',11,11,'138 1234 5678'],
    ['AU','Австралия','61','XXX XXX XXX',9,9,'412 345 678'],
    ['BR','Бразилия','55','(XX) XXXXX-XXXX',10,11,'(11) 91234-5678'],
    ['AR','Аргентина','54','XX XXXX-XXXX',10,11,'11 1234-5678']
  ];
  const flag = iso => String.fromCodePoint(...iso.split('').map(c => 127397 + c.charCodeAt(0)));
  const countries = new Map(rows.map(([iso,name,dial,mask,min,max,sample])=>[iso,{iso,name,dial,mask,min,max,sample,flag:flag(iso)}]));
  rows.forEach(row=>{
    const item = countries.get(row[0]);
    const option = document.createElement('option');
    option.value = item.iso;
    option.textContent = `${item.flag} ${item.name} (+${item.dial})`;
    select.appendChild(option);
  });
  select.value = 'BY';
  const digitsOnly = s => (s || '').replace(/\D/g,'');
  const current = () => countries.get(select.value) || countries.get('BY');
  const formatted = (digits,mask) => {
    let out='',i=0;
    for(const ch of mask){
      if(ch==='X'){
        if(i===digits.length) break;
        out += digits[i++];
      } else if(i<digits.length) out+=ch;
    }
    if(i<digits.length)out+=' '+digits.slice(i);
    return out;
  };
  const refresh = () => {
    const country = current();
    visual.textContent = `${country.flag} +${country.dial}`;
    select.setAttribute('aria-label',`Страна телефона: ${country.name}, +${country.dial}`);
    if(document.activeElement===input) input.placeholder = country.sample;
    else if(!input.value) input.placeholder = 'Телефон *';
    const digits = digitsOnly(input.value);
    normalized.value = digits ? `+${country.dial}${digits}` : '';
  };
  function applyFormat(){
    const country = current();
    const old = input.value;
    const oldCaret = input.selectionStart === null ? old.length : input.selectionStart;
    let digitsBefore = digitsOnly(old.slice(0,oldCaret)).length;
    let digits = digitsOnly(old);
    // Accept international paste: +372..., +375..., etc. Longest prefix wins.
    if(old.trim().startsWith('+')){
      const matched=[...countries.values()].filter(item=>digits.startsWith(item.dial))
        .sort((a,b)=>b.dial.length-a.dial.length)[0];
      if(matched){
        const previous=current();
        const chosen=matched.dial===previous.dial?previous:matched;
        select.value=chosen.iso;
        digits=digits.slice(chosen.dial.length);
        digitsBefore=Math.max(0,digitsBefore-chosen.dial.length);
      }
    }
    digits=digits.slice(0,current().max);
    input.value=formatted(digits,current().mask);
    if(document.activeElement===input){
      // Preserve caret position after grouping punctuation is added/removed.
      let count=0,pos=0;
      while(pos<input.value.length && count<digitsBefore){
        if(/\d/.test(input.value[pos]))count++;
        pos++;
      }
      try{input.setSelectionRange(pos,pos);}catch{}
    }
    refresh();
  }
  select.addEventListener('change',()=>{
    input.value=formatted(digitsOnly(input.value).slice(0,current().max),current().mask);
    refresh();
    input.dispatchEvent(new Event('input',{bubbles:true}));
  });
  input.addEventListener('focus',refresh);
  input.addEventListener('blur',()=>{if(!input.value) input.placeholder='Телефон *';});
  input.addEventListener('beforeinput',event=>{
    if(!['deleteContentForward','deleteContentBackward'].includes(event.inputType)||input.selectionStart!==input.selectionEnd)return;
    const start=input.selectionStart;
    const step=event.inputType==='deleteContentBackward'?-1:1;
    let at=step<0?start-1:start;
    if(at<0||at>=input.value.length||/\d/.test(input.value[at]))return;
    // Deleting a mask separator should delete the adjacent digit, rather than
    // reinsert the separator and trap the caret at the same position.
    while(at>=0&&at<input.value.length&&!/\d/.test(input.value[at]))at+=step;
    if(at<0||at>=input.value.length)return;
    event.preventDefault();
    input.value=input.value.slice(0,at)+input.value.slice(at+1);
    const caret=step<0?at:start;
    input.setSelectionRange(caret,caret);
    input.dispatchEvent(new Event('input',{bubbles:true}));
  });
  input.addEventListener('input',applyFormat);
  refresh();
  window.scPhone={
    getE164:()=>normalized.value,
    getCountry:()=>current().iso,
    getDigits:()=>digitsOnly(input.value),
    valid:()=>{
      const count=digitsOnly(input.value).length;
      const country=current();
      return count>=country.min && count<=country.max && country.dial.length+count<=15;
    },
    requiredDigits:()=>current().min===current().max?`${current().min}`:`${current().min}–${current().max}`
  };
})();
