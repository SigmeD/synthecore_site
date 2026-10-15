# SyntheCore — механика Hero на базе v23.1

> Последнее уточнение: [компактный начальный Hero](hero-compact-verification.md). Стартовая высота баннера и фиксированная viewport-сцена разделены; баннер раскрывается вместе с фото, footer привязан к его нижнему краю. Прежнее статическое fullscreen-правило для самого Hero отменено.

> Актуальное дополнение14.10.2026: scrub:true, одна reveal timeline, активный desktop Hero занимает viewport, Lenis virtualScroll удерживает READY до нового жеста. Отдельного handoff/opacity следующей секции нет. Точные параметры и проверки — [hero-gate-verification.md](hero-gate-verification.md); прежние описания scrub1 ниже исторические.

14 октября 2026 г. Реализация прошла браузерную матрицу; контрольный исходник сохранён в `backup/v23.1-before-lenis/`. [Протокол и артефакты](verification.md).

## Владельцы

js/main.js содержит сохранённые обработчики меню и карточек. js/hero-scroll.js управляет скроллом и единственной Timeline; js/hero-geometry.js вычисляет crop и покрытие текста. CSS сохраняет дизайн и задаёт слой/маску.

Локальные зависимости: Lenis 1.3.26, GSAP и ScrollTrigger 3.12.5. Источники, SHA-256 и лицензии — в assets/vendor и docs/vendor-manifest.json. Для запуска сайта внешний CDN не нужен.

## Синхронизация

Официальная интеграция: GSAP ticker вызывает `lenis.raf(time * 1000)`, `lenis.on('scroll', ScrollTrigger.update)`, `gsap.ticker.lagSmoothing(0)`. autoRaf false. Старые ручные вычисления Hero, собственный RAF и CSS sticky/smooth убраны.

Lenis: duration 1.2, lerp 0, smoothWheel true, syncTouch false. В исходнике этой версии duration/easing имеют приоритет; lerp явно обнулён. Lenis сглаживает окно, scrub 1 сглаживает отдельное раскрытие фотографии. Ручного фильтра progress и второго сглаживания положения окна нет. Остановка и обратная прокрутка проверены в браузере без отскока и неограниченного хвоста.

Официальные источники получены через Context7: [Lenis](https://github.com/darkroomengineering/lenis/tree/v1.3.26), [ScrollTrigger](https://gsap.com/docs/v3/Plugins/ScrollTrigger/).

## Timeline и изображение

Закрепляется существующий #imageScrollSticky: pin true, pinSpacing true, start top top, end 1,1 × innerHeight, scrub 1, anticipatePin 1, invalidateOnRefresh true. На заданных desktop дистанции — 845, 1188 и 2376 px. Начальные 0,35 секунды заменены на 1 после доступа к live Roveia и браузерной проверки.

В сетке остаётся пустой aria-hidden placeholder с исходной геометрией и тенью. Единственный оригинальный .photo переносится в Hero. Размеры слоя и натурально пропорционального изображения записываются только при setup/refresh. Кадры изменяют clip-path, x/y, одинаковые scaleX/scaleY, opacity и цвета. Явные scaleX/scaleY исключают разницу округления alias scale в GSAP, обнаруженную на 4K.

Mask inset раскрывается от рамки центральной фотографии до внутренних границ баннера. Скругление Hero дополнительно обрезает слой. Масштабирование линейно, без elastic/back/snap. object-fit fill безопасен здесь: заданные ширина/высота изображения уже имеют натуральное отношение сторон. Кадрирование сохраняется, фотография не растягивается.

Затемнение идёт от прогресса 0,08 до 0,30 через sine.inOut. Это сохраняет контраст белых букв на светлой части фото уже во время частичного пересечения. Максимальная opacity 0,98 относится к существующему градиентному затемнению, а не к сплошному чёрному слою. Ярлык фотографии постепенно исчезает в диапазоне 0,34–0,64.

Границы строк измеряются через Range.getClientRects, а не по широкой обёртке. Существующие h1/span/paragraph и нижние подписи используют background-clip:text: два линейных градиента ограничивают цвет горизонтальными и вертикальными краями текущей маски. На голубом буквы тёмные, на фотографии — светлые; оранжевый ряд остаётся оранжевым. Переход проходит по мягкой границе 4 px, без переключения целой строки, когда маска покрыла лишь её часть. Полностью покрытый/непокрытый элемент получает обычный цвет без градиента. Координаты кэшируются при setup/refresh; копий текста, новых обёрток, подложек и layout-read на кадрах нет. Text-shadow отключён при transparent gradient fill, поскольку в Chromium он рисуется поверх цветовой заливки; в полностью покрытом состоянии обычная тень сохраняется. Размеры и переносы не меняются; cleanup восстанавливает исходные inline styles. Промежуточные кадры проверены визуально.

Transform ускоряет движение изображения; clip-path и цвета могут требовать paint. Формальные FPS/long tasks и гарантия GPU для всего эффекта не измерялись.

## Refresh и режимы

Инициализация ждёт document.fonts.ready и image.decode. До этого оригинальная фотография видна в сетке. ScrollTrigger обрабатывает resize; onRefresh измеряет обновлённый pin, инвалидирует Timeline и восстанавливает progress. Замер в refreshInit удалён, поскольку там pin ещё имеет старую ширину. Orientation/pageshow вызывают refresh; размеры Lenis обновляются после него.

При width ≤850, aspect ratio ≥3:1, отсутствии hover/fine pointer или reduced motion контроллер снимается. Lenis уничтожается, ticker callback и scroll-listener удаляются, GSAP context revert убирает spacer; фото и исходные inline styles возвращаются в сетку. Desktop reduced motion сохраняет обычную desktop-композицию. Переключения проверены без дублирования фотографии/spacer.

Без Lenis остаётся GSAP с нативным скроллом. Без GSAP/ScrollTrigger остаётся статичная страница с фото. Эти отказы проверены отдельно.

CSS исправляет обнаруженные перекрытия: минимум верхнего поля заголовка на desktop высотой до 950, восстановленные внутренние поля mobile и исключение desktop reduced motion из мобильного display-правила. Размеры шрифтов, контент и исходные обработчики карточек не менялись.

## Якоря и клавиатура

Lenis anchors false — осознанное отклонение от стартового задания anchors true. Встроенный обработчик этой версии не фильтрует modified/new-tab и допускает нативное действие. Единственный собственный фильтр обычных same-page ссылок отменяет двойной переход и делегирует движение тому же lenis.scrollTo. Hash обновляется через history; фокус переносится после завершения, без повторного скролла. CSS scroll-padding/scroll-margin учитываются.

Модифицированные клики, download, внешние ссылки и mailto не перехватываются. Проверка Ctrl-click подтверждает defaultPrevented false и неизменность текущей страницы; открытие вкладки остаётся поведением браузера.

Клавиши скролла завершают остаточную Lenis-инерцию перед нативным действием; поля ввода и кнопки исключены. Initial hash корректируется после создания spacer. Popstate сбрасывает инерцию для нативного восстановления истории. Прерванный переход не переносит устаревший фокус.

## Диагностика

```javascript
window.__synthecoreScrollQA.getEngine()
window.__synthecoreScrollQA.getProgress()
window.__synthecoreScrollQA.getScrollProgress()
window.__synthecoreScrollQA.getPinDistance()
window.__synthecoreScrollQA.photoMounted()
window.__synthecoreScrollQA.getState()
window.__synthecoreScrollQA.refresh()
```

Активные engine: lenis-gsap-scrolltrigger, gsap-scrolltrigger. Статичные: native-mobile, native-reduced-motion, native-missing-dependencies, native-missing-image, native-unmeasured, native-initialization-error. До готовности — initializing.

getProgress — отрисованная Timeline, getScrollProgress — ScrollTrigger. Из-за scrub они кратковременно отличаются; статичный режим возвращает нулевые progress/distance и реальный native engine.
