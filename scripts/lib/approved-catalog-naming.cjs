'use strict';
// QA only. The owner approved this exact /raboty/ copy on 2026-10-21 after
// viewing the local preview. Runtime content still lives in the HTML template.
// Restore only these edits before comparing against the immutable v27 SHA.
const cases = [
  ['b2b', 'B2B-кабинет для клиентов', 'Кабинет клиента', 'Веб-сервис', 'Кабинет клиентов', 'Веб-сервис', 'Заявки и документы'],
  ['flowers', 'Приложение заказа цветов', 'Приложение для заказа цветов', 'UX/UI-концепт · интерактивный прототип', 'Мобильный сервис', 'Прототип', 'Мобильный сервис'],
  ['crm', 'Кастомная CRM', 'CRM для управления продажами', 'Веб-сервис · CRM', 'Продажи и клиенты', 'Веб-сервис', 'Клиенты и сделки'],
  ['beauty', 'Beauty Insight AI', 'Управление студией красоты', 'Интерактивный прототип · BeautyTech', 'Аналитика', 'Прототип', 'Финансовая аналитика'],
  ['prostor', '«Простор»', 'Интернет-магазин товаров для дома', 'Дизайн-концепт · E-commerce', 'Интернет-магазин', 'Прототип', 'Каталог и заказы'],
  ['metal', 'Расчёт стоимости металлоконструкций', 'Калькулятор стоимости металлоизделий', 'Веб-сервис · Производственные расчёты', 'Расчёты и КП', 'Веб-сервис', 'Финансовая аналитика'],
];
function replaceOnce(text, approved, original) {
  if (text.split(approved).length !== 2) throw Error('Expected exactly one approved catalog value: ' + approved);
  return text.replace(approved, original);
}
function restoreV27CatalogCopy(file, text) {
  if (!['templates/pages/works.html', 'raboty/index.html'].includes(file)) return text;
  let count = 0;
  const restored = text.replace(/<article class="case-card case-card--([^"]+)">[\s\S]*?<\/article>/g, (article, id) => {
    const row = cases.find(row => row[0] === id);
    if (!row) throw Error('Unexpected catalog project: ' + id);
    const [, oldTitle, title, oldFormat, oldTopic, format, topic] = row;
    article = replaceOnce(article, '<h2>' + title + '</h2>', '<h2>' + oldTitle + '</h2>');
    article = replaceOnce(article, 'aria-label="Открыть описание проекта: ' + title + '"', 'aria-label="Открыть описание проекта: ' + oldTitle + '"');
    article = replaceOnce(article, 'alt="Иллюстрация проекта ' + title + '"', 'alt="Иллюстрация проекта ' + oldTitle + '"');
    article = replaceOnce(article, '<span class="tag tag--blue">' + format + '</span>', '<span class="tag tag--blue">' + oldFormat + '</span>');
    article = replaceOnce(article, '<span class="tag tag--mint">' + topic + '</span>', '<span class="tag tag--mint">' + oldTopic + '</span>');
    if (id === 'flowers') article = replaceOnce(article, '<p>Интерактивный мобильный прототип', '<p>Мобильный прототип');
    if (id === 'beauty') article = replaceOnce(article, '<p>Интерактивный прототип аналитики', '<p>Прототип аналитики');
    if (id === 'prostor') article = replaceOnce(article, 'Прототип интерфейса (дизайн-концепт), не действующий магазин.', 'Дизайн-концепт, не действующая платформа.');
    count++;
    return article;
  });
  if (count !== 6) throw Error('Expected six approved catalog cards');
  return restored;
}
module.exports = {restoreV27CatalogCopy};
