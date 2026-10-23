'use strict';
// Owner-authorized 2026-10-23: reverse only the catalog title, summary and category text slots.
const path=require('node:path');
const {catalogCopy,escape}=require('./project-copy.cjs');
const original={
  "b2b": {
    "title": "B2B-кабинет<br>для клиентов",
    "description": "Клиент самостоятельно создаёт заявки, отслеживает их статусы и получает документы. История обработки, уведомления и работа с контрагентами — в одном кабинете."
  },
  "flowers": {
    "title": "Приложение заказа цветов",
    "description": "Мобильный прототип сервиса заказа цветов и подарков. Каталог, поиск, фильтры, избранное, корзина и оформление заказа. Продуманы профиль, история заказов и доставка."
  },
  "crm": {
    "title": "Кастомная CRM",
    "description": "Собственная CRM для управления продажами, клиентами и работой менеджеров. Сделки, контакты, задачи, аналитика и автоматизация — в одной системе, которую можно дорабатывать под процессы компании."
  },
  "beauty": {
    "title": "Beauty Insight AI",
    "description": "Прототип аналитики для владельца салона: выручка, маржа, загрузка мастеров, повторные записи и клиентская база. Проблемные зоны, рекомендации и задачи показаны на демонстрационных данных."
  },
  "prostor": {
    "title": "«Простор»",
    "description": "Интернет-магазин товаров для дома: каталог, карточки товаров, корзина и оформление заказов. Продуманы кабинет покупателя и отдельный интерфейс владельца для управления магазином. Дизайн-концепт, не действующая платформа."
  },
  "metal": {
    "title": "Расчёт стоимости металлоконструкций",
    "description": "Сервис для расчёта стоимости металлоконструкций, подготовки смет и коммерческих предложений. Справочники материалов и работ, типовые конструкции, контроль маржинальности с согласованием и история версий — в одной системе."
  }
};
for(const [id,copy] of Object.entries(require('./works-copy.cjs')))original[id].category=copy.category;
function restoreHomeCopy(file,html,catalogSource){
 if(!['index.html','templates/pages/home.html'].includes(file))return html;
 const copy=catalogCopy(path.resolve(__dirname,'../..'),catalogSource);let count=0;
 const restored=html.replace(/<article class="sc-work-item" data-work-id="([^"]+)"[\s\S]*?<\/article>/g,(article,id)=>{
  if(!original[id]||!copy[id])throw Error('Unknown homepage project '+id);count++;
  for(const [key,pattern] of [['title',/(<h2 class="sc-work-content__title"[^>]*>)([\s\S]*?)(<\/h2>)/],['description',/(<p class="sc-work-content__description">)([\s\S]*?)(<\/p>)/],['category',/(<span class="sc-work-content__type">)([\s\S]*?)(<\/span>)/]]){
   let matched=false;article=article.replace(pattern,(_,a,text,b)=>{
    matched=true;
    if(text!==escape(copy[id][key])&&text!=='{{work_'+id+'_'+key+'}}')throw Error('Unapproved '+key+' copy: '+id);
    return a+original[id][key]+b;
   });if(!matched)throw Error('Missing homepage '+key+': '+id);
  }return article;
 });if(count!==6)throw Error('Expected six homepage projects');return restored;
}
module.exports={restoreHomeCopy};
