# CSS-каскад v31

База до чистки: `038a062f95b52f833910aa99a12e2364b8460d97`. До правок сохранены CSSOM и вычисленные стили четырёх контрольных viewport, включая Hero в pin, закрытые/открытые аудитории и все работы.

## Порядок и ответственность

| Порядок | Файл | Область |
|---|---|---|
| 1 | `css/main.css` | Переменные/база → хедер → исторические Hero/audience правила и media queries → действующие ID-scoped Hero и audience overrides → footer |
| 2 | `assets/vendor/lenis-1.3.26.css` | Служебные классы текущего Lenis, не менять |
| 3 | `css/works.css` | Независимые sticky-карточки и стеклянные подписи; побайтно сохранён |

Начальная CSSOM содержит 453 style rules с учётом локальных библиотек и Works. Условия не переставлялись. Основные ширины: 360/380/440/480/540/790/850/851/1100/1150/1170/1190/1600/2000/2300/2600/3000 px; имеются пересечения по высоте и aspect ratio. Полный список исходных условий хранится в локальном `output/playwright/refactor-v31/chromium/before/<viewport>/cascade.json`, а не заменяется одним desktop/mobile breakpoint.

Примеры specificity (ID, class/pseudo-class, type): `.hero-stage` = (0,1,0), `.hero .hero-stage` = (0,2,0), `#top .hero .hero-stage` = (1,2,0), `#imageScrollSticky > .hero` = (1,1,0), `#audiences .audience-option .audience-name` = (1,2,0). Поздние ID-scoped правила перекрывают часть прежних деклараций. GSAP добавляет inline transform/opacity/clip-path; `!important` reduced-motion и expander-правила сохраняются.

## Контрольные вычисленные значения до правок

| Viewport | Высота Hero | H1 | Заголовок аудиторий | Рамка Works до transform | Режим Hero |
|---|---|---|---|---|---|
| 1440x900 | 667.797px | 46px | 32px | 1388.16px × 504.281px | lenis-gsap-scrolltrigger |
| 1920x1080 | 801.359px | 58.56px | 32px | 1850.88px × 672.375px | lenis-gsap-scrolltrigger |
| 390x844 | 844px | 43.68px | 32px | 370px × 672.078px | native-mobile |
| 320x700 | 749.734px | 42px | 32px | 300px × 554px | native-mobile |

Это измеренные значения Chromium, а не новые дизайн-токены. Полные пары computed styles сохраняются с каждым контрольным PNG; проверка после правок требует точного совпадения тех же свойств и позиции прокрутки.

## Единственная группа удалений

Удалены 22 целых leaf-правила, один неиспользуемый селектор из общего reduced-motion списка и 2 пустых media-блока. Объём CSS уменьшился на 3562 байт. Свойства активных правил, порядок файлов и действующие media conditions сохранены.

`eyebrow`, `audience-option-action` и `motion-ready` отсутствуют в HTML и всех четырёх runtime JS. Анимация вставляет только photo holder/pin-spacer и переключает другие, сохранённые классы. Поэтому перечисленные ветви не могут совпасть также при hover, focus, active, scroll, mobile и reduced-motion. У смешанного правила сохраняются живые `.audience-card-shell,.audience-card` и исходный `transition:none!important`.

| Исходный selector list | Media/supports context | Действие |
|---|---|---|
| `.eyebrow` | base | Удалено целое правило |
| `.eyebrow` | `(min-width: 2300px)` | Удалено целое правило |
| `.eyebrow` | `(max-width: 540px)` | Удалено целое правило |
| `.eyebrow` | `(min-width: 851px) and (max-height: 1000px)` | Удалено целое правило |
| `.eyebrow` | `(min-width: 851px)` | Удалено целое правило |
| `.eyebrow` | `(min-width: 851px) and (max-height: 1050px)` | Удалено целое правило |
| `.hero .eyebrow` | `(min-width: 851px)` | Удалено целое правило |
| `.audience-option-action` | base | Удалено целое правило |
| `.audience-option.is-active .audience-option-action, .audience-option:hover .audience-option-action, .audience-option:focus-visible .audience-option-action` | base | Удалено целое правило |
| `.audience-section.motion-ready .audience-heading, .audience-section.motion-ready .audience-option, .audience-section.motion-ready .audience-visual` | base | Удалено целое правило |
| `.audience-section.motion-ready.is-visible .audience-heading, .audience-section.motion-ready.is-visible .audience-option, .audience-section.motion-ready.is-visible .audience-visual` | base | Удалено целое правило |
| `.audience-section.motion-ready .audience-option:nth-child(1)` | base | Удалено целое правило |
| `.audience-section.motion-ready .audience-option:nth-child(2)` | base | Удалено целое правило |
| `.audience-section.motion-ready .audience-option:nth-child(3)` | base | Удалено целое правило |
| `.audience-section.motion-ready .audience-visual` | base | Удалено целое правило |
| `.audience-option-action` | `(max-width: 790px)` | Удалено целое правило |
| `.audience-section.motion-ready :is(.audience-heading, .audience-option, .audience-visual)` | `(prefers-reduced-motion: reduce)` | Удалено целое правило |
| `.audience-card-shell, .audience-card, .audience-option-action` | `(prefers-reduced-motion: reduce)` | Удалён только .audience-option-action |
| `.audience-option:not(.is-active) .audience-option-action` | base | Удалено целое правило |
| `.audience-option.is-active .audience-option-action` | base | Удалено целое правило |
| `.audience-option-action` | `(min-width: 851px)` | Удалено целое правило |
| `.audience-option .audience-option-action, .audience-option:not(.is-active) .audience-option-action` | `(min-width: 851px)` | Удалено целое правило |
| `.audience-option:is(.is-active, :hover, :focus-visible) .audience-option-action` | `(min-width: 851px)` | Удалено целое правило |

Два удалённых пустых media-блока имели условия `(min-width:851px) and (min-height:851px) and (max-aspect-ratio:3/1)` и `(min-width:2300px) and (min-height:851px) and (max-aspect-ratio:3/1)`; содержимого CSS у них не было.

## Сохранённый долг

Исторические переопределения действующих Hero/audience-селекторов оставлены на местах. В частности, геометрия Hero зависит от нескольких пересекающихся условий высоты и ширины, а остаточные transition/overflow/filter свойства могут наследоваться из ранних блоков. Отсутствие правила в одном screenshot не доказывает его ненужность. Раскладывать этот каскад по новым файлам или удалять поздние overrides без расширенной матрицы рискованно; текущая задача этого не требует.

Runtime JS не переписывался: владение Lenis, методы teardown/rebuild и существующий алгоритм Works сохранены. Стартовый масштаб Works выбирается при setup, resize обновляет геометрию через refresh; отдельную перестройку tweens при пересечении 480 px не вводили под видом чистки.

Итог визуального сравнения и границы проверки — [QA v31](QA_V31.md).
