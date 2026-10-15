# Прокрутка и события v31

Документ описывает существующий код `js/hero-scroll.js`, `js/main.js`, `js/works.js` и `css/works.css`. Это описание реализации; результаты запуска находятся в [QA v31](QA_V31.md). Сведения о wheel-gate, растущем баннере и обязательном следующем жесте в старых отчётах относятся к отменённым итерациям.

## Hero и единственный Lenis

После `DOMContentLoaded` Hero сохраняет исходные inline-стили, регистрирует обработчики и ждёт `document.fonts.ready` и декодирования фото. При desktop с точным указателем/hover, доступными GSAP/ScrollTrigger/геометрией и изображением `rebuild()` перемещает исходное фото в Hero, оставляя позиционный holder, измеряет crop и создаёт GSAP context.

Reveal timeline закрепляет `#imageScrollSticky` с `pinSpacing:true` на `1.1 × innerHeight`, `scrub:true`, `ease:none`. Маска и равномерный transform фото заканчивают раскрытие на `5/6` timeline. Остальные tween затемняют фото, скрывают caption и меняют цвет существующего текста по пересечению с маской. Размеры баннера не анимируются. Отдельная timeline перемещает только `.audience-copy` от `clamp(80px, 10vh, 140px)` к нулю за `0.7 × innerHeight` после конца pin; `scrub:.55`. Видимость появляется в начале того же диапазона за расстояние начального смещения.

Если Lenis доступен, создаётся ровно один экземпляр: `duration:1.2`, `lerp:0`, `smoothWheel:true`, `syncTouch:false`, `anchors:false`, `autoRaf:false`. GSAP ticker вызывает `lenis.raf(time * 1000)`, а событие Lenis scroll обновляет ScrollTrigger. Независимого RAF-loop и перехвата wheel с остановкой на контрольной точке нет. Диагностический `gateState` не блокирует ввод. Без Lenis GSAP может работать с нативной прокруткой.

## Refresh, смена режима и очистка

`ScrollTrigger` refresh заново измеряет фото и текст, инвалидирует tween и сохраняет прогресс. Refresh также пересчитывает Lenis; текущая цель инерции сохраняется в пределах нового limit. `orientationchange`, `pageshow` и диагностический `refresh()` запускают пересчёт. Встроенная обработка resize ScrollTrigger дополняется refresh из Works.

Изменение reduced motion, compact media query (`max-width:850px` либо `min-aspect-ratio:3/1`) или hover/pointer вызывает `rebuild()`. Сначала `teardown()` снимает ticker и Lenis scroll callback, уничтожает Lenis, вызывает `context.revert()`, возвращает исходное фото, удаляет holder/runtime-классы, восстанавливает исходные inline-стили и очищает измерения/ожидающий anchor. Затем выбирается animated или native режим. Обработчики уровня документа/окна устанавливаются один раз при загрузке страницы и не добавляются каждым rebuild.

Reduced motion, compact viewport и отсутствие точного hover-указателя оставляют статичный Hero и нативную прокрутку. Недоступная геометрия, GSAP/ScrollTrigger, изображение или ошибка инициализации также дают native fallback. На touch Lenis не создаётся.

## Навигация, меню и аудитории

Capture-обработчик обычных немодифицированных same-page anchor-кликов передаёт цель тому же Lenis, сохраняет hash через history и переводит фокус после завершения. Download, другие окна, модифицированные клики и внешние адреса остаются браузеру. Без Lenis ссылки нативны. Перед клавиатурной прокруткой завершается текущая инерция; само нажатие обрабатывает браузер. `popstate` сбрасывает ожидающий фокус и перезапускает Lenis для наблюдения нативного восстановления. Initial hash обрабатывается после готовности Hero.

`js/main.js` отдельно обновляет класс хедера на scroll, закрывает меню по ссылке, Escape, клику вне хедера и desktop resize. Превью аудиторий изначально закрыто. Его открывает намеренное движение указателя, клавиатурный focus либо tap; стрелки/Home/End перемещают focus, Escape сбрасывает выбор. Scroll закрывает только hover-превью, не выбирает категорию и не создаёт ScrollTrigger. Tap-превью можно прокручивать для чтения.

## Works

Sticky задан CSS для шести независимых sibling-карточек. `js/works.js` создаёт шесть tween масштаба `.sc-work-frame`: от `.885` (до 480px — `.90`) до `1`, начало `top bottom`, конец `top top`, `scrub:1.05`. Desktop-движение подсветки и подписи вычисляется из прогресса того же tween; отдельной timeline или scroll listener для него нет. Works не владеет Lenis.

`setup()` уничтожает прежние tween, очищает transform и CSS-переменные подписи и выбирает режим заново при изменении reduced motion. В reduced motion CSS снимает sticky и оставляет работы в обычном потоке. При отсутствии GSAP/ScrollTrigger класс `sc-works--fallback` отключает масштабирование; CSS sticky при этом сохраняется, если reduced motion не включён. Resize вызывает refresh ScrollTrigger. Значение начального масштаба выбрано при setup; алгоритмы resize в этом рефакторинге не меняются без отдельного воспроизводимого дефекта.

`window.__synthecoreScrollQA` и `window.__synthecoreWorksQA` предоставляют состояние и refresh для браузерных проверок. Они диагностические и не заменяют прокрутку, снимки и проверку fallback в браузере.
