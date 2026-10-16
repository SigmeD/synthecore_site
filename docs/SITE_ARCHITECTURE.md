# Архитектура SyntheCore v60

Документ для разработчика: где находится код сайта, какие файлы отвечают за поведение разделов и как они связаны. Краткое описание проекта и запуск — в [README](../README.md).

Статический сайт без сборки, приложения на сервере и менеджера пакетов. `index.html` содержит восемь секций: `#top` (содержит `#imageScrollSticky` и Hero), `#audiences`, `#works`, `#services`, `#process`, `#testimonials`, `#faq`, `#contact`. Навигация использует `#floatingHeader` и `#mobilePanel`. Текущая версия v60 находится в `main`. Основная рабочая копия запускается на 4173; отдельная интеграционная копия может работать на 4174. Версия v31 сохранена в истории Git.

## Ресурсы и порядок подключения

CSS: `css/main.css` → `assets/vendor/lenis-1.3.26.css` → `css/works.css` → `css/services.css` → `css/process.css` → `css/testimonials.css` → `css/faq-footer.css`. Поздние файлы содержат также правила стыков соседних секций, например Process → Reviews; перестановка подключений меняет каскад.

Все внешние скрипты имеют `defer`: GSAP 3.12.5 → ScrollTrigger 3.12.5 → Lenis 1.3.26 → `hero-geometry.js` → `hero-scroll.js` → `main.js` → `works.js` → `services.js` → `process.js` → `testimonials.js` → `faq-footer.js`. Библиотеки и лицензии находятся в `assets/vendor/`; [vendor manifest](vendor-manifest.json) фиксирует поставляемые файлы. [Asset manifest](asset-manifest.json) содержит размеры и SHA256 локальных изображений/SVG, включая Works, Services, Process и демопортреты. Это контроль целостности, а не подтверждение прав или подлинности контента.

Контрольные суммы требуют сохранения байтов при checkout. `.gitattributes` задаёт `assets/**/*.svg -text` и `assets/vendor/** -text`, отключая преобразование окончаний строк для этих файлов. Без этого чистый Windows checkout менял SVG, например 3075 → 3091 байт, и нарушал manifest. После исправления чистый экспорт Git проходит 36 проверок хешей. `assets/vendor/LENIS-LICENSE.txt` хранит исходные CRLF, совпадающие с поставкой; семантика библиотек/лицензии и версии не изменились.

Шесть Works — sibling `article.sc-work-item` внутри `.sc-works-stack` в порядке b2b → flowers → crm → beauty → prostor → metal. Подписи HTML сохраняют статусы концептов/прототипов; изображения не подменяют доступный текст. Services содержит шесть карточек, Process — три шага, Reviews — четыре явно обозначенных демо, FAQ — семь button/answer-пар с ARIA. Footer сохраняет `#contact` и почтовую CTA; три SVG-path анимируются средствами SVG независимо от скролла.

## Владельцы поведения

| Файл | Ответственность |
|---|---|
| `js/hero-geometry.js` | Чистые расчёты crop, маски, масштаба и покрытия текста; также используются Node-проверкой |
| `js/hero-scroll.js` | Hero reveal/pin, параллакс `.audience-copy`, единственный Lenis и GSAP ticker callback, якоря, пересчёт и teardown/rebuild |
| `js/main.js` | Хедер, мобильное меню с возвратом фокуса по Escape, hover/focus/tap-превью аудиторий |
| `js/works.js` | Одна GSAP pinned timeline v45 для шести работ; очистка и fallback |
| `js/services.js` | Desktop entrance и один horizontal pin v46; keyboard focus переводит тот же pin к карточке; native горизонтальный скролл, кнопки, клавиатура и mouse drag вне pin |
| `js/process.js` | Hover/focus/tap трёх шагов, линия прогресса, IntersectionObserver и небольшой scroll-lift иллюстрации |
| `js/testimonials.js` | Scroll-stream v58: CSS sticky, один неприкрепляющий ScrollTrigger, затухающий RAF для координат карточек; видимый keyboard focus через тот же stream; native fallback |
| `js/faq-footer.js` | Accordion, ResizeObserver FAQ с отложенным глобальным refresh, лёгкий вход FAQ, подъём волн на scroll, пауза SVG при reduced motion |

Все модули, кроме defer-IIFE FAQ/footer, стартуют на `DOMContentLoaded`. Hero дополнительно ждёт `document.fonts.ready` и декодирования фото. Другие модули начинают настройку независимо; Works, Services и Reviews повторяют глобальный refresh на `load` в соответствующих режимах. Единственный Lenis создаётся только в подходящем desktop Hero. На compact/touch/reduced-motion Hero остаётся native; Works может сохранять свою pinned timeline на мобильном viewport. Reviews имеет собственный RAF для рисования, Process и FAQ используют краткие RAF-задачи; они не создают второго владельца прокрутки.

В runtime появляются классы режима, inline transforms, photo holder и GSAP pin-spacer. Их нельзя считать мёртвыми ресурсами по одному исходному DOM. Очистка каждого модуля снимает только принадлежащие ему tween/trigger/стили. Условия режимов, длительности и точные инициаторы `ScrollTrigger.refresh()` — в [механике прокрутки](SCROLL_MECHANICS.md).

## Источники и границы приёмки

Полный runtime перенесён из v60, Reviews сохраняет механику v58. Подтверждённые интеграционные исправления затрагивают только keyboard focus Services/Reviews, возврат фокуса меню и refresh после изменения FAQ; обычная геометрия wheel/touch Reviews сохранена. [Релиз](RELEASE_V60.md) и [реестр файлов](RELEASE_V60_FILES.md) фиксируют baseline, точные исключения и ограничения; фактическая приёмка ведётся в [QA v60](QA_V60.md). Исходные отчёты в `docs/release-source-v60/`, документы v32–v58, [QA v31](QA_V31.md), `backup/` и старые сценарии сохраняют историю; прежние PASS не переносятся на новую сборку.

Отзывы/портреты демонстрационные; тексты FAQ и контакты требуют утверждения до production. Наличие локального HTTP-сервера и прохождение статических проверок не равнозначны разрешению на публикацию.
