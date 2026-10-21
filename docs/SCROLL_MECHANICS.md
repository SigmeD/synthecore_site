# Движение: главная v62 и каталог v27

Описание относится к runtime, вошедшему в main коммитом `3256e53` через PR #6. Значения сверены с локальными исходниками; это документация замороженной реализации, не предложение изменить параметры. [Источник и ограничения](../AGENTS.md), [QA](qa/v62-on-v27/README.md).

## Владельцы скролла

На `/` единственный Lenis создаёт `js/hero-scroll.js`. Он сохраняется при смене размеров и нативном режиме Hero; отключается при reduced motion. На `/raboty/` Hero не подключён, свой единственный Lenis создаёт исходный v27 `js/raboty-scroll.js`. Это разные документы, не два владельца на одной странице.

| Параметр | Главная v62 | Каталог v27 |
|---|---|---|
| Интерполяция | `lerp: 0.068` | `duration: 1.2`, `lerp: 0` |
| Общие опции | `smoothWheel: true`, `syncTouch: false`, `anchors: false`, `autoRaf: false` | Те же значения |
| Часы | Ticker GSAP → `lenis.raf(time * 1000)` | Ticker GSAP при доступном GSAP |
| Синхронизация | Событие Lenis scroll → ScrollTrigger update; `lagSmoothing(0)` | Собственный исходный путь v27 |
| Reduced motion | Lenis уничтожается, нативная прокрутка | Lenis уничтожается, нативная прокрутка |

На главной `wheelMultiplier:1`, `touchMultiplier:1.5`. `virtualScroll` сжимает только необычно большие wheel-импульсы: порог 320, коэффициент 0.6, логарифмический хвост. Прежнего покадрового принудительного `scrollTo(window.scrollY)` в ticker нет. Wheel-gate, checkpoint с обязательным следующим жестом и второй независимый Lenis не используются.

`window.SyntheCoreMotion` предоставляет `requestRefresh`, `getScrollState` и `scrollTo`. Навигация услуг/отзывов использует того же владельца вертикальной прокрутки. Нативное плавное перемещение не добавляется поверх активного Lenis.

## CSS sticky и сцены

Hero, Works и Services удерживаются **CSS sticky**, а ScrollTrigger рисует прогресс. Эти три сцены не создают старых GSAP pin-spacer. Названия QA вроде `pinStart`, `pinned-horizontal` или `sc-services-pin` сохранены в исходниках и не означают, что включён GSAP `pin:true`.

### Hero

Модуль ждёт готовности шрифтов и изображения, измеряет crop, сохраняет inline-стили и создаёт контекст. Анимация Hero требует доступных библиотек/геометрии, подходящего указателя, выключенного reduced motion и отсутствия compact-условия `(max-width:850px), (min-aspect-ratio:3/1)`. Нативный Hero на телефоне сам по себе не выключает глобальный Lenis.

Секция получает `--sc-hero-stage-height`, а `css/sticky-handoff-v61.css` задаёт сцену высотой `stage + 110svh`; `#imageScrollSticky` становится sticky с `top:0`. Диапазон `synthecore-hero` — `round(innerHeight * 1.1)`, `scrub:true`. Фото раскрывается clip-path и равномерным scale вложенного изображения по **всему** диапазону (`revealPortion:1`). Внешний контейнер сохраняет размеры сцены: его bounding box не является измерением увеличения видимой фотографии.

`synthecore-audience-parallax` начинается у конца Hero и двигает только `.audience-copy` от `clamp(80px,10vh,140px)` к нулю за `round(innerHeight * .7)`, `scrub:true`. Fade занимает начальное расстояние смещения. Исходная скрытая `.photo-caption` остаётся в DOM, поскольку код к ней обращается.

### Наши работы

Шесть карточек. `.sc-works-stack` удерживается sticky, высоту секции дополняет `--sc-works-scroll-length`. Основной `sc-works-timeline`: `start:'top top'`, дистанция `round(5 * innerHeight * .92)`, `scrub:true`; GSAP pin отсутствует.

**Первая карточка тоже растёт.** Отдельный `sc-works-first-entry` идёт от `top bottom` до `top top` и доводит scale от `.885` (до 480px — `.9`) до `1`, ease `none`. Он заканчивается к началу основной сцены. Следующие карточки приезжают с `y:innerHeight` и увеличиваются с `sine.inOut`; предшественник остаётся на месте до перекрытия. Glass-подписи добавляются для ширины от 851px. Дополнительного последнего hold нет.

Resize пересчитывает длину; переходы через 480/850px перестраивают соответствующие ветви. При reduced motion или недоступных зависимостях работы идут нативно в обычном потоке. Одна только узкая ширина не выключает сцену Works.

### Что мы делаем

Условие sticky-горизонтали: ширина от 851px, высота от 650px, доступные GSAP/ScrollTrigger, выключенный reduced motion и горизонтальный travel больше 1px.

`sc-services-entry` идёт от `top bottom` до `top top`; подъём до `min(35px,4.5vh)` завершается к началу sticky-сцены. `sc-services-pin` перемещает track на `-railTravel`, где `railTravel = track.scrollWidth - viewport.clientWidth`; дистанция — `max(250,round(railTravel * 1.08))`, **`scrub:true`**. Высота секции включает `--sc-services-scroll-length`, scene удерживается CSS sticky.

В закреплённом режиме `css/v62-services-alignment.css` задаёт viewport **`overflow: clip`**. На старте первая карточка полностью видна и выровнена с заголовком; `scrollLeft` остаётся нулевым. Track перемещается только transform. На мобильном остаётся нативная горизонтальная лента с touch swipe, кнопками, клавишами и mouse drag.

В sticky-режиме кнопки/клавиатура ищут вертикальную позицию через `SyntheCoreMotion.scrollTo`. Клавиатурный фокус карточки не должен создавать вторую скрытую горизонтальную прокрутку. `ResizeObserver` следит за viewport/track и пересогласовывает overflow/режим; window resize пересчитывает геометрию.

### Шаги, отзывы и FAQ

Process не создаёт Lenis или GSAP pin. Hover/focus временно подсвечивает шаг, click/tap сохраняет выбор; прогресс рассчитывается по `index / max(1, steps.length - 1)`. IntersectionObserver и локальный RAF обслуживают исходные эффекты иллюстрации, reduced motion их упрощает.

Отзывы анимируются при ширине от 1200px и высоте от 800px, доступных GSAP/ScrollTrigger и без reduced motion. Финальный CSS: **`height:533svh; min-height:3770px`**, то есть +30% от 410svh/2900px. Дистанция зависит от фактической высоты viewport; на 1440×900 секция была 4797px.

Один `sc-testimonials-card-stream` идёт от `top 72%` до `bottom bottom`, без GSAP pin. Прогресс отображения интерполируется локальным RAF с **`smoothSeconds:0.18`**. Карточки непрозрачны, четвёртая остаётся видимой при выходе. Клавиатурный seek использует общую геометрию и владельца скролла. Мобильный/reduced режим — нативный.

FAQ сохраняет семь вопросов, один открытый ответ и исходный scroll-entry эффект. ResizeObserver после 120ms без новых уведомлений запрашивает общий refresh через `SyntheCoreMotion`; fallback — ScrollTrigger refresh. Весь `faq-footer.js` защищён SHA, поэтому задача по FAQ не разрешает редактировать этот файл автоматически.

## Refresh и жизненный цикл

Модули главной используют общую `SyntheCoreMotion.requestRefresh()` из Hero. Запрос объединяется через RAF; пока Lenis находится в smooth-прокрутке, измерение откладывается с повторным запросом через 150ms. Это не новая длительность сцен. Встроенные события ScrollTrigger ограничены `visibilitychange,DOMContentLoaded,load`; resize обслуживает общая очередь.

| Инициатор | Причина пересчёта |
|---|---|
| Hero | Rebuild, resize/orientation/pageshow, диагностический refresh |
| Works | Setup, resize/load, смена responsive/reduced ветви |
| Services | Setup, resize/load, смена wide/reduced, наблюдение overflow |
| Отзывы | Setup/load и изменение размеров геометрии |
| FAQ | Изменение высоты accordion после 120ms |

Глобальный refresh вызывает `resizeLenis()`, который сохраняет цель действующей инерции в новом limit. `onRefresh` Hero заново измеряет геометрию и восстанавливает прогресс; audience fade пересчитывается по offset/range. Works имеет приоритеты entry `-4` / timeline `-5`, Services entry `-15` / horizontal `-20`, отзывы `-30`.

Teardown Hero возвращает фото на место holder, восстанавливает классы/стили и удаляет контекст. Он не уничтожает Lenis при каждом responsive rebuild: создание/уничтожение зависит от reduced motion и доступности зависимостей. Общие document/window listeners устанавливаются один раз.

## Оболочка и каталог v27

На главной меню уже содержится в защищённом `main.js`; на каталоге используется `site-header.js`. Оба модуля одновременно на одну страницу не подключаются. Разметка хедера/футера остаётся общей через build-time partials.

`footer-waves.js` создаёт три `.rwb-layer` в `#roveiaWaveBg` с исходными скоростями `.50/.60/.70`. Движение останавливается вне viewport, в скрытом документе и при reduced motion. Повторная инициализация защищена. Старых `.sc-footer__wave`/SMIL-узлов нет; legacy-loop внутри неизменённого v62 FAQ не получает таких узлов.

`footer-reveal.js` сохраняет CTA scale `.8 → 1` и opacity за `.92s`, нижнюю навигацию/copyright — opacity за `2.55s`. Copyright наблюдается без отрицательного rootMargin, чтобы показаться у конца мобильной страницы; CTA/bottom сохраняют исходные условия. Reduced motion показывает контент сразу. Ни волны, ни reveal не менялись при переносе v62.

Каталог сохраняет исходные эффекты v27, reveal карточек, нативные dialog и блокировку скролла на время диалога с возвратом фокуса. Его Lenis имеет прежние параметры v27 и не обязан совпадать с глобальными параметрами главной v62.

## Диагностика

На главной доступны `__synthecoreScrollQA`, `__synthecoreWorksQA`, `__synthecoreServicesQA`, `__synthecoreProcessQA`, `__synthecoreTestimonialsQA` и `SyntheCoreMotion`. На каталоге — `__synthecoreWorksScrollQA`. Прогресс и размеры нужно читать в фактической конфигурации viewport, не переносить измерения v60 на текущие сцены.

Исходный `QA/DEVTOOLS_STICKY_TRACE.js` сохраняет положения sticky и число GSAP pin. Полные автоматические traces могут включать намеренные мгновенные переходы теста между сценариями; сравнивать wheel-последовательности отдельно. Отсутствие JS-ошибок и автоматические события не заменяют ручной тест физической мышью/тачпадом. Актуальная процедура — в [QA](qa/v62-on-v27/README.md).
