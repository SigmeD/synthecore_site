# Архитектура SyntheCore: главная v62, оболочка и каталог v27

Текущее уточнение: главная использует семь секций и 17 неизменённых motion-файлов v62 поверх ветки `feat/works-shared-shell-v27`. Общие partials, footer waves/reveal и каталог сохранены из v27; на главной меню уже находится в защищённом `main.js`, поэтому отдельный `site-header.js` подключён только в каталоге. Полная карта источников и актуальные проверки: [v62 поверх v27](V62_ON_V27_INTEGRATION.md). Описания механики v60 ниже — история основы, а не инструкция восстанавливать прежние анимации.

Документ для разработчика: где находится код сайта, какие файлы отвечают за поведение разделов и как они связаны. Краткое описание проекта и запуск — в [README](../README.md).

Ветка `feat/works-shared-shell-v27` содержит статический сайт с двумя маршрутами; [PR #4](https://github.com/SigmeD/synthecore_site/pull/4) открыт в `main`. В основной ветке пока остаётся v60. Серверное приложение и менеджер пакетов для просмотра не нужны; HTML генерируется из шаблонов Node-скриптом без дополнительных зависимостей и хранится в Git. [Решения интеграции и откат](WORKS_V27_INTEGRATION.md).

| Маршрут | Исходный шаблон | Готовый файл | Содержимое |
|---|---|---|---|
| `/` | `templates/pages/home.html` | `index.html` | Восемь секций v60: top/Hero, audiences, works, services, process, testimonials, FAQ, contact |
| `/raboty/` | `templates/pages/works.html` | `raboty/index.html` | Одна works-surface с SVG, intro, шесть карточек, общий Footer, нативный dialog |

Главная секция `#works` и отдельный каталог — разные потребители одних исходных PNG. Навигация Header ведёт в каталог, старые прямые ссылки `/#works` продолжают работать. Логотип ведёт на `/`, Services/FAQ — на реальные якоря главной, Contacts — на Footer текущей страницы. `aria-current` каталога задаётся генератором.

## Шаблоны и общая оболочка

`templates/partials/header.html` и `footer.html` — единственные источники разметки Header v24 / Footer v12. `scripts/build-site.cjs` вставляет их в обе страницы и разрешает контекстные пути. После изменения шаблонов выполните `node scripts/build-site.cjs`; `--check` сравнивает готовые HTML с источниками. Runtime fetch, SPA и дополнительная JS-библиотека для компонентов не используются.

Локальный launcher обслуживает `/raboty/` через directory index, поддерживает font MIME и `-NoBrowser`. Порт по умолчанию 4173. В сеансе 20 октября копия этой ветки `D:\Projects\synthecore\output\worktrees\works-v27` работает на 4183; основная папка остаётся на `main`. Порты и доступность серверов следует проверять при новом запуске.

## Ресурсы и порядок подключения

CSS главной: `main.css` → Lenis CSS → `works.css` → `services.css` → `process.css` → `testimonials.css` → `faq-footer.css` → `fonts.css` → `design-tokens.css` → `site-footer.css` → `shared-header-cta.css`. Стили стыков секций и их исходный порядок сохранены. `faq-footer.css` теперь содержит только FAQ, общая оболочка подключается последней.

CSS каталога: `main.css` → `fonts.css` → `design-tokens.css` → `raboty-base.css` → `raboty-surface.css` → `raboty-reveal.css` → `raboty-cards.css` → `raboty-scroll.css` → `raboty-type.css` → `site-footer.css` → `shared-header-cta.css` → Lenis CSS. Старые дубли Footer из архива не подключаются. Header использует общую базу из `main.css` и согласованные роли v24; Footer — один общий набор стилей и типографику v23. [Токены и границы v0.1](DESIGN_SYSTEM_V0_1.md).

Defer-скрипты главной: GSAP 3.12.5 → ScrollTrigger 3.12.5 → Lenis 1.3.26 → `hero-geometry.js` → `hero-scroll.js` → `site-header.js` → `main.js` → `works.js` → `services.js` → `process.js` → `testimonials.js` → `faq-footer.js` → `footer-waves.js` → `footer-reveal.js`.

В каталоге короткий `raboty-motion.js` синхронно задаёт motion-класс до отрисовки. Затем defer: те же три библиотеки → `site-header.js` → `raboty-cards.js` → `raboty-scroll.js` → `footer-waves.js` → `footer-reveal.js` → `raboty-effects.js`. Hero/Services/Reviews-модули главной сюда не подключаются.

Библиотеки и лицензии хранятся в `assets/vendor/`; [vendor manifest](vendor-manifest.json) фиксирует поставляемые файлы. [Asset manifest](asset-manifest.json) содержит размеры и SHA256 локальных медиа, [font manifest](font-manifest.json) — Manrope и лицензию OFL. Шрифт доставляется локально через `fonts.css` без Google Fonts-запросов. Проверка суммы подтверждает целостность поставки, а не подлинность контента.

Контрольные суммы требуют сохранения байтов при checkout. `.gitattributes` задаёт `-text` для SVG, vendor и fonts; исходное форматирование лицензий сохранено. Историческая v60 проверяла 36 хешей; новая ветка проверяет 40 с учётом Manrope/OFL. Версии библиотек не изменены.

На главной шесть Works — sibling `article.sc-work-item` внутри `.sc-works-stack`. В каталоге шесть `article.case-card > button.case-card__open`, image/body — соседи в нормальном потоке. Порядок общий: b2b → flowers → crm → beauty → prostor → metal; честные подписи концептов/прототипов сохранены. Services содержит шесть карточек, Process — три шага, Reviews — четыре демо, FAQ — семь button/answer-пар с ARIA. Общий Footer сохраняет `#contact` и почтовую CTA; один `#roveiaWaveBg` получает три SVG-слоя от JS-движка v12, старых SMIL-слоёв нет.

## Владельцы поведения

| Файл | Ответственность |
|---|---|
| `js/hero-geometry.js` | Чистые расчёты crop, маски, масштаба и покрытия текста; также используются Node-проверкой |
| `js/hero-scroll.js` | Hero reveal/pin, параллакс `.audience-copy`, единственный Lenis и GSAP ticker callback, якоря, пересчёт и teardown/rebuild |
| `js/site-header.js` | Общий Header: scroll-state, mobile menu, закрытие по ссылке/вне/resize и возврат фокуса по Escape |
| `js/main.js` | Только hover/focus/tap-превью аудиторий главной |
| `js/works.js` | Одна GSAP pinned timeline v45 для шести работ; очистка и fallback |
| `js/services.js` | Desktop entrance и один horizontal pin v46; keyboard focus переводит тот же pin к карточке; native горизонтальный скролл, кнопки, клавиатура и mouse drag вне pin |
| `js/process.js` | Hover/focus/tap трёх шагов, линия прогресса, IntersectionObserver и небольшой scroll-lift иллюстрации |
| `js/testimonials.js` | Scroll-stream v58: CSS sticky, один неприкрепляющий ScrollTrigger, затухающий RAF для координат карточек; видимый keyboard focus через тот же stream; native fallback |
| `js/faq-footer.js` | Только FAQ: accordion, ResizeObserver с отложенным глобальным refresh, лёгкий вход контента |
| `js/footer-waves.js` | Общие три SVG-волны v12, один RAF при видимости, пауза вне viewport/в скрытой вкладке/при reduced motion |
| `js/footer-reveal.js` | Однократный CTA reveal и независимые появления bottom/fine print; защита повторного подключения |
| `js/raboty-motion.js`, `raboty-effects.js` | Motion-класс до отрисовки; фоновый параллакс одной поверхности |
| `js/raboty-scroll.js` | Единственный Lenis каталога, однократный reveal карточек, same-page anchors с фокусом, reduced motion и пауза при dialog |
| `js/raboty-cards.js` | Нативный dialog; данные из HTML карточки, ESC/закрытие, scroll-lock и возврат фокуса |

Модули секций главной стартуют на `DOMContentLoaded`, FAQ и общие компоненты — defer-IIFE после разбора DOM. Hero дополнительно ждёт `document.fonts.ready` и декодирования фото; Works/Services/Reviews повторяют refresh на `load` в своих режимах. На главной Lenis создаётся только подходящим desktop Hero, compact/touch/reduced-motion сохраняют native scroll; секция Works при этом может сохранять pin. Каталог создаёт один собственный Lenis без Hero и снимает его при reduced motion. Reviews/Process/FAQ и волны имеют свои задачи рисования, а не второго владельца прокрутки.

В runtime появляются классы режима, inline transforms, photo holder и GSAP pin-spacer. Их нельзя считать мёртвыми ресурсами по одному исходному DOM. Очистка каждого модуля снимает только принадлежащие ему tween/trigger/стили. Условия режимов, длительности и точные инициаторы `ScrollTrigger.refresh()` — в [механике прокрутки](SCROLL_MECHANICS.md).

## Источники и границы приёмки

В интеграции v27 семь основных секций и 11 исходных CSS/JS-модулей главной совпадают с базой; новые изменения оболочки не заменяют сцены v60/Reviews v58. Исправления каталога и fine-print observer, точное сравнение с архивом и [реестр файлов](WORKS_V27_FILES.md) приведены в [интеграции](WORKS_V27_INTEGRATION.md). Текущая приёмка — [QA v27](qa/works-v27/README.md); [релиз v60](RELEASE_V60.md), [QA v60](QA_V60.md), старые документы и `backup/` сохраняют историю своих итераций.

Отзывы/портреты демонстрационные; тексты FAQ и контакты требуют утверждения до production. Наличие локального HTTP-сервера и прохождение статических проверок не равнозначны разрешению на публикацию.
