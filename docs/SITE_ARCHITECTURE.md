# Архитектура SyntheCore v31

Актуальная база — `038a062f95b52f833910aa99a12e2364b8460d97`, принятая интеграция Works через PR #1. Это статический сайт без сборки, сервера приложения и менеджера пакетов. `start-local.ps1` обслуживает файлы через HTTP; `start-local.bat` запускает его.

## DOM и ресурсы

`index.html` содержит плавающий `#floatingHeader`, мобильное меню `#mobilePanel`, Hero внутри `#imageScrollSticky`, `#audiences`, `#works`, `#services`, `#contact`. Порядок основных секций неизменен. `#services` — будущий раздел с временным текстом; `#contact` — реальный footer со ссылкой на почту.

В Works шесть sibling `article.sc-work-item` внутри `.sc-works-stack`: b2b → flowers → crm → beauty → prostor → metal. Каждый содержит `.sc-work-frame`, отдельный медиа-слой и HTML-подпись `.sc-work-content` с заголовком. Изображения декоративны для accessibility tree, содержимое работ доступно в тексте. Первый PNG загружается приоритетно, остальные — лениво. Концепты и прототипы обозначены в подписях; их нельзя описывать как подтверждённые внедрения.

Порядок CSS: `css/main.css` → `assets/vendor/lenis-1.3.26.css` → `css/works.css`. Первый файл задаёт общую страницу, Hero, аудитории, навигацию и footer; второй — служебные классы Lenis; третий — самостоятельный стек работ. Сохранённый порядок правил и media queries важен для каскада; детали — [CSS-каскад](CSS_CASCADE_V31.md).

Все скрипты подключены с `defer` в порядке: GSAP 3.12.5 → ScrollTrigger 3.12.5 → Lenis 1.3.26 → `js/hero-geometry.js` → `js/hero-scroll.js` → `js/main.js` → `js/works.js`. Библиотеки и лицензии локальные в `assets/vendor/`; контрольные суммы — в [vendor manifest](vendor-manifest.json). Изображения и исходные ассеты описаны в [asset manifest](asset-manifest.json).

## Владельцы поведения

| Файл | Ответственность |
|---|---|
| `js/hero-geometry.js` | Чистые расчёты crop, равномерного масштаба, маски и покрытия текста; используется также Node-проверкой |
| `js/hero-scroll.js` | Инициализация Hero после fonts/image readiness, единственный Lenis/ticker, reveal/pin и параллакс аудиторий, навигация и teardown/rebuild |
| `js/main.js` | Состояние хедера/меню и независимое hover/focus/tap-превью аудиторий |
| `js/works.js` | По одному tween/ScrollTrigger масштаба на каждую из шести работ, fallback и диагностическое состояние |
| `css/works.css` | Sticky-позиционирование, размеры и адаптация работ, стек, стеклянная подпись и reduced-motion layout |

Обработчики регистрируются на `DOMContentLoaded`. Hero ждёт готовности шрифтов и декодирования фото; остальные блоки запускаются независимо. Runtime-классы, временный photo holder, pin-spacer и inline-стили анимации нужно учитывать при поиске неиспользуемого CSS. Один Lenis остаётся единственным источником инерции; Works не создаёт ни второго Lenis, ни RAF-loop.

Точная последовательность событий и fallback — [механика прокрутки](SCROLL_MECHANICS.md). Проверки v31 и реальные ограничения — [QA](QA_V31.md). `backup/`, старые спецификации и отчёты являются историей, а локальный `output/` не является поставляемой частью сайта.
