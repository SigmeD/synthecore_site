# Roveia → SyntheCore: диагностический отчёт до реализации

14 октября 2026. Исследованы живой https://www.roveia.com/ и фактический
http://127.0.0.1:4173/ в Chromium через Playwright/CDP. На момент составления
этого отчёта код сайта не изменён: хеши шести контрольных файлов совпали с
`backup/roveia-full-audit-before-2026-10-14/manifest.json`.

## Вывод

Сейчас SyntheCore уже не блокирует колесо. Его отличие от референса — прежде
всего распределение существующего диапазона анимации: фотография заканчивает
раскрытие одновременно с освобождением pin. В Roveia медиа заканчивает рост
на 5/6 timeline, затем закрепление ещё действует до окончания смены цвета
текста. Для этого не нужен новый жест, wheel-lock, snap или новый spacer.

Вторая секция Roveia появляется через **одноразовый Webflow slideInBottom**,
а не через самостоятельный ScrollTrigger-параллакс. Предыдущее утверждение,
что именно scroll-linked параллакс подтверждён в оригинале, исходниками не
подтвердилось. SyntheCore имеет собственный согласованный параллакс.

Важные границы задачи: при viewport **3840×2160 CSS px** второй заголовок
Roveia виден уже на 75% pin. При быстром вводе unpin Roveia тоже может начать
движение до визуального окончания numeric scrub. Поэтому запрет раннего
появления и строгая последовательность при быстром вводе — требования к
SyntheCore, а не доказанные универсальные свойства Roveia.

## Метод и первичные данные

- Одинаковые CSS viewport: 1366×768, 1920×1080, 3840×2160, 390×844; DPR=1.
  Растровые пиксели старых записей не использовались как CSS-замеры.
- Elements/Computed: DOM, bbox, padding/margin/gap, transform, opacity,
  overflow; CDP `CSS.getMatchedStylesForNode` для ключевых элементов.
- Network/Sources: сохранены реально загруженные HTML, CSS, публичные JS;
  версии проверены глобальными объектами и URL загруженных библиотек.
- Console: `ScrollTrigger.getAll()`, дочерние tweens и их длительности;
  `lenis` найден как верхнеуровневый lexical const. Отсутствие `window.lenis`
  не означало отсутствия работающего экземпляра.
- DevTools listeners: четыре window wheel listener в Roveia — Lenis и
  пассивные слушатели GSAP; отдельного Hero wheel-lock не обнаружено.
- Контрольные кадры: 0/25/50/75/83.33/90/100%, переход +25/+50% высоты окна,
  reverse. После программного позиционирования ожидалось окончание scrub.
- Отдельно — непрерывный ввод, один быстрый ввод и остановка у конца медиа.
  Диагностический RAF/PerformanceObserver и CDP trace работают только в
  проверочных страницах; в проект их не внедряли.

Данные находятся в `../output/playwright/roveia-full-audit-2026-10-14/`:
[discovery.json](../output/playwright/roveia-full-audit-2026-10-14/discovery.json),
[deep.json](../output/playwright/roveia-full-audit-2026-10-14/deep.json),
[measurements-before.json](../output/playwright/roveia-full-audit-2026-10-14/measurements-before.json),
[input-performance-before.json](../output/playwright/roveia-full-audit-2026-10-14/input-performance-before.json),
[публичный inline JS](../output/playwright/roveia-full-audit-2026-10-14/inline-motion.js).
Trace-файлы и свежие кадры лежат в этой же папке. Записаны текущие полные
кадры down/reverse для четырёх размеров SyntheCore и двух размеров Roveia;
`recording.json` сохраняет реальные времена и поданные wheel delta.

## Что фактически делает Roveia

**Библиотеки:** GSAP/ScrollTrigger 3.15.0, Lenis 1.3.11, Webflow,
jQuery 3.5.1. GSAP загружается из Webflow CDN и ещё раз из jsDelivr.
Версии сайта не переносим в SyntheCore: сама разница версий не установлена
как причина проблемы. Из найденных sourceMappingURL есть публичная ссылка
Lenis на `lenis.min.js.map`; у изученных Webflow bundles явной ссылки нет.
Публичного исходного Webflow-проекта у нас нет.

**Lenis:** duration=1.2, smoothWheel=true, wheelMultiplier=1, autoRaf=false;
единственный общий GSAP ticker вызывает `lenis.raf(time*1000)`, scroll
вызывает `ScrollTrigger.update`, lagSmoothing(0). options.lerp=0.1,
но в загруженной версии ветвь duration/easing имеет приоритет над lerp.
Это не обнаруженный порог сопротивления.

**Hero:** pin на `.section_home-hero`, start=`top top`, end=`1.1*innerHeight`,
scrub=1, anticipatePin=1, invalidateOnRefresh=true. pinSpacing не задан
явно, используется стандартное пространство ScrollTrigger. У Hero нет
snap. Единственный найденный snap находится в последующей `.brands-section`.
Комментарий в исходнике упоминает DISTANCE=1.2, но фактическая константа=1.1;
замеры согласуются с константой, а не с комментарием.

**Медиа:** `.video-hero` абсолютный внутри `.wrapper_home-hero`. `metrics()`
берёт DOM-границы `.video-slot` и wrapper. Tween меняет left/top/width/height
с ease:none, duration=0.5. Внутри один video с object-fit:cover; отдельный
чёрный overlay с opacity 0→0.75 также длится0.5. Цвет группы текста меняется
с позиции0.1, длительность по умолчанию0.5. Итого timeline длится0.6:
медиа заканчивается на0.5/0.6=5/6, цвет — на1.0. Load-интеракция Webflow
сначала масштабирует видео0→1; для скролл-замеров ожидали её завершения.

**Вторая секция:** следует за pin-spacer в обычном потоке.
`Webflow.require('ix2').store.getState().ixData` подтверждает:

- `.heading-11`: SCROLL_INTO_VIEW → slideInBottom, delay200ms;
- `.flex-block-45`: тот же preset, delay300ms;
- preset: opacity0, translateY100px, затем opacity1/y0 за1000ms,
  easing outQuart; loop=false, playInReverse=false.

У этой секции нет самостоятельного ScrollTrigger. Повторное возвращение
вверх не скрывает уже проигранную Webflow entrance. Нельзя выдавать это за
симметричную scrub-анимацию. Карточки выбираются hover, имеют реальные URL.

## Сопоставление

| Механизм | Roveia | Текущий SyntheCore | Причина/место изменения |
|---|---|---|---|
| Ввод | Lenis, без Hero-порога | Lenis, старый gate уже удалён | Новый wheel handler не нужен |
| Pin | section_home-hero, 1.1×H | imageScrollSticky, 1.1×H | Дистанция уже совпадает; не увеличивать |
| Медиа завершается | 83.33% timeline | 100% timeline | duration двух reveal tweens в hero-scroll.js |
| Последняя часть pin | Медиа уже стабильно | Медиа продолжает расти до unpin | Нет отдельного момента законченной композиции |
| Связь reveal/scroll | scrub1 с отставанием | scrub:true по сглаженному Lenis | Оставить true ради строгого порядка при быстром вводе |
| Рост | left/top/width/height видео | clip-path и равномерный transform фото | Наша геометрия верна; замена не нужна |
| Затемнение | Однородный black0.75 | Утверждённый gradient и opacity0.98 | Дизайн SyntheCore сохраняем |
| Заголовок второго блока | Первоначально opacity0, timed entrance | Всегда opacity1, copy получает y | Отсутствует стадия допуска появления |
| Второй блок | Одноразовый slide100px/outQuart | Обратимый y80–140→0, scrub0.55 | Согласованный параллакс не заменять на Webflow |
| Фон Hero | Высота постоянна | Высота постоянна | Нарастание голубого контейнера не подтвердилось |

Сырые размеры при одинаковом viewport (CSS px):

| Viewport | Hero Roveia | Hero SyntheCore | Pin end | Заголовок при end: R / S |
|---|---:|---:|---:|---:|
| 1366×768 |736|706.55|845|880 / 894|
| 1920×1080 |968|801.36|1188|1112 / 1027.08|
| 3840×2160 |968|968|2376|1112 / 1256|
| 390×844 |985.88|844|Hero pin отсутствует|native layout|

Низ баннера SyntheCore1920 расположен выше, поэтому следующий заголовок
уже внутри viewport при pin end. На4K оба сайта показывают следующую секцию
раньше окончания pin. Это фактическая геометрия, не «лишний spacer»;
расширять Hero или компенсировать её margin запрещено и не требуется.

Медиа Roveia полностью раскрыто примерно при scroll704/990/1980; до pin
end остаётся141/198/396px. У текущего SyntheCore такого участка нет.
Точный момент зависит от rounding и visual scrub. В тесте непрерывного
ввода Roveia при scroll1189 уже имела mediaProgress1; в быстром тесте
при scroll1195 mediaProgress=0.940824. SyntheCore в обоих случаях имеет1.
Это аргумент против безусловного возврата numeric scrub1.

## Performance и ошибки

В1920×1080, одинаковый диагностический ввод30×20px плюс reverse200px:
оба сайта приняли суммарный input без порога или нового жеста. Roveia:
87 Layout, суммарно6.94ms, max0.229ms; SyntheCore:1 Layout,0.058ms.
Long tasks >50ms во время этих сценариев не зарегистрированы. RAF p95:
16.6ms / 8.5ms. Это локальная инструментированная сессия, не универсальный
FPS-бенчмарк; Roveia дополнительно декодирует видео и запускает аналитику.
Регулярный Layout у неё объясняется изменением width/height медиа.

Pageerror в матрице нет. У локального проекта Network ошибок нет.
Roveia имеет ERR_ABORTED у фоновых видео/аналитики; это сохранено как факт,
не названо отказом Hero. На desktop у Roveia найден горизонтальный overflow;
его копировать не будем. У SyntheCore overflow отсутствует.

## Варианты и рекомендуемый diff

1. **Только распределить reveal:** две длительности→5/6 существующего
   timeline; синхронизировать координаты цветовой маски. Самый малый diff,
   но заголовок по-прежнему рано виден на высоких viewport.
2. **Тот же reveal + появление copy в уже существующем parallax tween.**
   Добавить autoAlpha0→1 с тем же start=Hero.end. Секция остаётся в потоке,
   y80–140→0, scrub0.55, размеры и отступы прежние. Это рекомендуемый
   минимальный вариант для требований SyntheCore. Видимость обратима,
   в отличие от Webflow original; на4K намеренно устраняется ранний показ.
3. **Буквально повторить DOM-resize медиа + numeric scrub1 + одноразовую
   Webflow entrance.** Это смена способа анимации и риск дополнительного
   reflow/рассинхронизации; нужна отдельная договорённость. Не выбираем.

Snap не предлагается: его нет у Hero референса. Wheel interception также
не обоснован: непрерывный ввод работает в референсе.

Предлагаемый runtime diff — только `js/hero-scroll.js`:
[proposed.diff](../output/playwright/roveia-full-audit-2026-10-14/proposed.diff).
Константа5/6 получена из живого timeline, а не из приблизительных скриншотов.
Текущий end, pinSpacing, Lenis duration, shade, crop, конечный scale и
параллакс не меняются. Новых обработчиков, таймеров, spacer или triggers нет.
Обновление теста сохранения исходников потребуется для разрешённых отличий.

Риски варианта2: начальная невидимость copy должна откатываться при reduced
motion/mobile; прямой переход по якорю должен показывать секцию; фокус
скрытых строк не должен создавать раннее превью. Проверить 1920/4K,
непрерывный/быстрый ввод, stop/reverse, resize, reload, breakpoint,
keyboard/anchors, mobile touch и все карточки.

## Ограничения и достоверность

Физические мышь/тачпад не использованы: получены реальные браузерные реакции
на эмулированный wheel. Старые video v3 сохранены отдельно для сопоставления,
но без их input-логов нельзя доказать новый жест или причину reverse.
Нет доступа к приватному Webflow-проекту. Точное совпадение геометрии,
затемнения, numeric scrub и одноразовых интеракций не обещается: часть
референса расходится с сохранением дизайна и строгими требованиями задачи.
