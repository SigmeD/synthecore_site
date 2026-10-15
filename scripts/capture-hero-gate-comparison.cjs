const fs=require('node:fs/promises');
const path=require('node:path');
const {chromium}=require(require.resolve('playwright-core',{paths:[process.cwd(),process.env.USERPROFILE]}));
const out=path.resolve(__dirname,'../output/playwright/hero-gate');
(async()=>{const b=await chromium.connectOverCDP('http://127.0.0.1:9222'),c=await b.newContext({viewport:{width:3776,height:1472}});
try{const p=await c.newPage();await p.goto('http://127.0.0.1:4173/');await p.waitForFunction(()=>window.__synthecoreScrollQA.getState().ready);
  const end=await p.evaluate(()=>window.__synthecoreScrollQA.getState().pinEnd);await p.mouse.move(2,2);
  await p.mouse.wheel(0,end*4);await p.waitForTimeout(1500);await p.screenshot({path:path.join(out,'3776x1472-B.png')});
  await p.mouse.wheel(0,360);await p.waitForTimeout(1500);await p.screenshot({path:path.join(out,'3776x1472-C.png')});
  const panels=[
    ...['1366x768','1920x1080','3840x2160'].flatMap(size=>[['A','Раскрытие'],['B','Полностью раскрыт — READY'],['C','Новый жест — переход'],['reverse-A','Обратное раскрытие'],['before-B','Прежняя реализация — конец раскрытия']].map(([stage,label])=>({group:size,label,src:stage==='before-B'?`before-${size}-B.png`:`${size}-${stage}.png`}))),
    {group:'Исходные записи и текущий сайт',label:'Roveia — устойчивый Hero, 2,55 с',src:'input-reference-2.55.png'},
    {group:'Исходные записи и текущий сайт',label:'Roveia — вход секции, 3,35 с',src:'input-reference-3.35.png'},
    {group:'Исходные записи и текущий сайт',label:'Прежний SyntheCore, 2,1 с',src:'input-local-2.1.png'},
    {group:'Исходные записи и текущий сайт',label:'Текущий SyntheCore — READY, 3776×1472',src:'3776x1472-B.png'},
    {group:'Исходные записи и текущий сайт',label:'Текущий SyntheCore — переход, 3776×1472',src:'3776x1472-C.png'},
  ];
  await fs.writeFile(path.join(out,'comparison.html'),`<!doctype html><html lang="ru"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Hero — контрольные кадры</title>
  <style>body{font:16px/1.5 system-ui;margin:24px;background:#eef0f2;color:#172027}h1{font-size:24px}nav{display:flex;gap:8px;flex-wrap:wrap;margin:16px 0}button{font:inherit;padding:8px 12px;border:1px solid #aaa;border-radius:6px;background:white;cursor:pointer}button[aria-pressed=true]{background:#172027;color:white}figure{margin:0}img{display:block;width:100%;height:auto;background:white}figcaption{margin:10px 0}a{color:#174d90}</style>
  <h1>Hero → «С кем работаем»</h1><p>Кадры А/Б/В и reverse при одинаковом размере окна внутри каждой группы. Заголовок физически вне окна в Б; после нового жеста движется вся секция.</p><nav id="groups"></nav><nav id="stages"></nav><figure><figcaption></figcaption><a id="full" target="_blank"><img alt="Контрольный кадр"></a></figure>
  <p>Исходные видео: секунды обозначают кадры внутри разных записей. События ввода в них отсутствуют. Размер файлов 3776×1472 не доказывает параметры viewport при записи.</p><p><a href="acceptance.json">Замеры и покадровые логи</a> · <a href="baseline.json">Прежняя реализация</a></p>
  <script>const panels=${JSON.stringify(panels)},groups=document.querySelector('#groups'),stages=document.querySelector('#stages');let current='1920x1080';function show(p){document.querySelector('img').src=p.src;document.querySelector('#full').href=p.src;document.querySelector('figcaption').textContent=p.group+' — '+p.label;for(const b of stages.children)b.setAttribute('aria-pressed',b.textContent===p.label)}function select(g){current=g;stages.replaceChildren();for(const p of panels.filter(x=>x.group===g)){const b=document.createElement('button');b.textContent=p.label;b.onclick=()=>show(p);stages.append(b)}for(const b of groups.children)b.setAttribute('aria-pressed',b.textContent===g);show(panels.find(p=>p.group===g&&p.src.endsWith('-B.png'))||panels.find(p=>p.group===g))}for(const g of [...new Set(panels.map(p=>p.group))]){const b=document.createElement('button');b.textContent=g;b.onclick=()=>select(g);groups.append(b)}select(current)</script></html>`);
  console.log('Saved 3776×1472 comparison frames and comparison.html');
}finally{await c.close();await b.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
