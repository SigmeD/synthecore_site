# Дизайн-система SyntheCore v0.1

Это первый слой общих компонентов и проверенных токенов. Эталон оболочки и каталога — переданный архив v27: Header v24, Footer v12, типографика v23, карточки v27. В main после PR #6 (`3256e53`, 21.10.2026) главная — v62; её собственные стили и движение не заменяются токенами v0.1. [Архитектура](SITE_ARCHITECTURE.md), [QA](qa/v62-on-v27/README.md). Хедер, футер и анимации заморожены.

## Источники разметки и поведение

| Компонент | Единственный источник | Стили и поведение |
|---|---|---|
| SiteHeader | `templates/partials/header.html` | `main.css`, `shared-header-cta.css`; на главной также ID-scoped `v62-v27-shell-preservation.css`. Меню: `main.js` на `/`, `site-header.js` на `/raboty/` |
| SiteFooter | `templates/partials/footer.html` | `site-footer.css`, общая типографика в `shared-header-cta.css`; `footer-waves.js`, `footer-reveal.js` |
| PrimaryButton / HeaderCTA / Arrow | Классы `.nav-cta`, `.main-cta`, `.catalog-intro__cta`, `.arrow` | `shared-header-cta.css`: 52 / 40 / 20 px |
| ProjectCard | Шесть семантических карточек в `templates/pages/works.html` | `raboty-cards.css`, `raboty-type.css`; modal читает данные из карточки через `raboty-cards.js` |
| PageSurface | Один `.works-surface` в шаблоне Works | `raboty-surface.css`, `raboty-reveal.css`, `raboty-scroll.css` |

`node scripts/build-site.cjs` вставляет оба partial в шаблоны страниц. `--check` проверяет актуальность готовых HTML. Навигация доступна без JavaScript. Генерируемые файлы `index.html` и `raboty/index.html` хранятся в Git, их следует менять через `templates/`.

Контекст сборки меняет только `aria-current="page"` и пути якорей: «Работы» всегда `/raboty/`, логотип `/`, «Услуги» и «Вопросы» ведут к существующим секциям главной, «Контакты» к футеру текущей страницы. Активный пункт остаётся тёмным. Для меню сохранены исходные владельцы каждой страницы; не подключать оба модуля одновременно и не выравнивать их код самостоятельно.

## Карта токенов

Все значения определены в `css/design-tokens.css`. Совместимые имена v24 ссылаются на эти токены, а не дублируют значения. Локальные адаптивные переменные карточек остаются внутри `body.works-catalog`.

| Семейство | Значения | Исходный экран / применение | Проверка |
|---|---|---|---|
| `--sc-color-ink/accent/accent-deep/surface` | #171E23 / #E44D1F / #C63D14 / white | v60 и v27; ink/accent карточек, общие роли; deep зарезервирован существующей палитрой | computed и исходный CSS |
| `--sc-color-copy-muted` | #75828D | Описание ProjectCard v27 | computed / screenshot |
| `--sc-color-tag-{blue,mint}-{bg,text}` | #E3EFFF/#347AD0; #E4F5EE/#329675 | Плашки v23 | computed / screenshot |
| `--sc-font-ui` | Manrope, Inter, system-ui | Header nav/CTA, Footer title/copy/nav, Works | Локальные font-face + computed |
| `--sc-font-size-display/body/card-title/nav/tag` | clamp(35px,4.86111vw,70px) / 16 / 24 / 16 / 14 | v23; mobile body 14, title 22, tags 12–13 | 320–2560 px |
| `--sc-font-weight-display/copy`, `--sc-line-display/copy` | 400 / 500; 1.1 / 1.5 | v23 | computed |
| `--sc-radius-card/surface`, `--sc-surface-outer-gap` | 24; clamp(20px,1.5vw,30px); clamp(12px,1vw,18px) | v27 карточка, общие роли поверхности; mobile сохраняет 20/18/10 из исходника | снимки, без глобального переопределения hero |
| `--sc-width-cards-max/gap-card/card-padding-inline/card-media-fade` | 1268 / 16 / 24 / 72 px | ProjectCard v27 | геометрия ~412×451, fade и gap |
| `--sc-height-header-desktop/header-cta/primary-cta`, `--sc-icon-arrow-size` | 56 / 40 / 52 / 20 px | v24 на обеих страницах | computed |
| `--sc-motion-card-shadow/lift/y` | 820ms / 640ms / −3px | hover v27 | computed + normal/hover + видео |

Некоторые seed-токены описывают контракт и не заменяют переменные главной v62. Система v0.1 ещё не покрывает весь сайт. Не следует добавлять глобальные шрифтовые переопределения, менять Hero, межсекционные отступы или шкалу теней без отдельной задачи. Текущий Manrope главной уже задан утверждёнными стилями v62.

## Адаптивные границы

Каталог `/raboty/`: 3 колонки выше 1180 px; 2 — 681–1180; 1 — до 680. Типографика: 850 и 650; карточки: 680 и 360. Header: меню до 850, высота 66; до 540 высота 62. Footer: отступы при 1000/700, mobile основание волн до 600. Главная v62 имеет отдельные responsive-условия сцен, описанные в [SCROLL_MECHANICS](SCROLL_MECHANICS.md).

## Motion и доступность

- Главная v62: единственный владелец Lenis/GSAP `hero-scroll.js`, `lerp:0.068`. Компактный/native Hero не выключает глобальный Lenis; reduced motion выключает. Hero/Works/Services закрепляются CSS sticky. Полные параметры — в [SCROLL_MECHANICS](SCROLL_MECHANICS.md).
- Каталог `/raboty/`: один Lenis, duration 1.2, lerp 0, syncTouch false. Однократный IntersectionObserver reveal карточек, ~760ms; поверхность .84s. При reduced motion Lenis уничтожается, контент остаётся видимым.
- Hover: подъём карточки −3 px, мягкая тень, нижняя ссылка оранжевая. Изображение и стрелка неподвижны. Cursor-follow отсутствует.
- Dialog: нативный `<dialog>`, ESC/крестик/возврат, фокус у исходной карточки; прокрутка документа блокируется на время окна, Lenis останавливается и возобновляется после закрытия. Сам диалог имеет `data-lenis-prevent` и overflow.
- Footer: оригинальная математика, seed, геометрия волн и времена v12. Три слоя 600/500/350 desktop, скорости .50/.60/.70, blur 16×1.2/1/.8, цвет #218AFF. Этот цвет относится только к эффекту волн.
- CTA Footer: opacity 0→1 и scale .8→1 за .92s, bezier(.22,.61,.36,1), без translateY, один раз. Навигация и copyright появляются независимо.
- Порог CTA/нижней навигации — исходный rootMargin −7%; у последней строки copyright rootMargin 0, чтобы она могла проявиться у конца мобильной страницы. Длительность её исходного fade 2.55s сохранена. Это исправление ошибки архивного observer, не изменение волн/CTA.
- Общие компоненты защищены от повторной инициализации. Волны не работают вне футера или в скрытой вкладке; reduced motion учитывается при загрузке и изменении настройки.

## Шрифты

В архиве v27 Manrope 400/500/600 запрашивался из Google Fonts. Те же начертания доставляются локально: `assets/fonts/manrope-{400,500,600}.ttf`, `css/fonts.css`, лицензия `OFL-Manrope.txt`. Источник: Google Fonts CSS для `family=Manrope:wght@400;500;600`, файлы `fonts.gstatic.com/s/manrope/v20/`. Геометрия оболочки/каталога сверена с загруженным Google Fonts в архивном эталоне. На главной защищённый `css/design-system-v61.css` сохраняет исходный Google Fonts `@import` v62; утверждение о полном отсутствии внешних шрифтовых запросов ко всему сайту не применяется.

## Правило развития

Для следующего общего токена фиксировать исходный экран, computed value, потребителей и проверку. Сначала добиваться совпадения с эталоном; изменение дизайна делать отдельной задачей. Локальные значения hero и контролы утверждённых волн не следует механически заменять общими токенами.
