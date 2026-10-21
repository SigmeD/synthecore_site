# Прокрутка и события: главная v60 и каталог v27

Описание относится к ветке `feat/works-shared-shell-v27`, [PR #4](https://github.com/SigmeD/synthecore_site/pull/4). На главной сохранены сцены v60, каталог и общая оболочка имеют отдельных владельцев поведения. Результаты этой интеграции — в [QA v27](qa/works-v27/README.md); [QA v60](QA_V60.md) описывает прежний этап. Старые wheel-gate, checkpoint с новым жестом, независимые Works tween и SMIL-footer относятся к истории.

## Главная: Hero и единственный Lenis

Hero ждёт fonts/image readiness, сохраняет исходные inline-стили и вызывает `rebuild()`. Анимация разрешена при GSAP/ScrollTrigger/геометрии, готовом фото, точном hover-указателе, выключенном reduced motion и вне compact media query `(max-width:850px), (min-aspect-ratio:3/1)`. Иначе сохраняется native Hero. Недоступный Lenis сам по себе не запрещает GSAP с нативной прокруткой.

`rebuild()` перемещает исходное фото в Hero, оставляет holder, измеряет crop/текст и создаёт context. `synthecore-hero` закрепляет `#imageScrollSticky` с `pinSpacing:true` на `round(innerHeight × 1.1)`, `scrub:true`, `invalidateOnRefresh:true`. Маска и равномерный scale завершают reveal на `5/6` timeline; остальные tween затемняют фото, скрывают caption и меняют цвет текста по покрытию. Размеры баннера не анимируются. `synthecore-audience-parallax` с `scrub:.55` движет только `.audience-copy` от `clamp(80px,10vh,140px)` к нулю за `round(innerHeight × .7)` после конца Hero pin. Появление занимает начальное расстояние смещения.

На главной только Hero создаёт Lenis: `duration:1.2`, `lerp:0`, `smoothWheel:true`, `syncTouch:false`, `anchors:false`, `autoRaf:false`. Один GSAP ticker callback передаёт `time × 1000` в `lenis.raf`; `lenis.on('scroll')` вызывает `ScrollTrigger.update()`, `lagSmoothing(0)` отключает коррекцию ticker. При внешнем сдвиге scroll больше 2px текущая инерция синхронизируется с браузером. Второго Lenis, независимого Lenis RAF или wheel-gate на главной нет. Отдельный каталог не подключает Hero и создаёт собственного единственного владельца, описанного ниже.

## Refresh и жизненный цикл

Глобальный `ScrollTrigger.refresh()` пересчитывает все сцены. Явные инициаторы в runtime:

| Модуль | Когда вызывается пересчёт |
|---|---|
| Hero | Успешный `rebuild()`; `orientationchange`; `pageshow`; диагностический `refresh()` |
| Works | Успешный `setup()`; каждый window `resize`; один window `load`; диагностический `refresh()` |
| Services | Успешный pinned `setup()`; смена условий при уже pinned режиме; window `resize`/`load`, если pinned |
| Reviews v58 | Успешный `setup()`; window `load`, если scroll-stream; при resize в том же scroll-stream режиме вызывается только `trigger.refresh()` этого блока |
| FAQ | ResizeObserver наблюдает высоту `#faq`; после 120ms без новых наблюдений вызывает глобальный `ScrollTrigger.refresh(true)` |

Встроенная обработка ScrollTrigger дополняет эти вызовы. Значения `refreshPriority` идут по сценам: Hero — значение по умолчанию, Works `-5`, Services entrance `-15`, Services pin `-20`, Reviews `-30`. Пересчёт Hero происходит в `onRefresh`, когда ширина pin уже обновлена: `measure()`, invalidate анимации с восстановлением totalProgress, `renderTones()`. Audience `onRefresh` пересчитывает длительность fade по offset/range и сохраняет прогресс.

Hero подписан на глобальное событие ScrollTrigger `refresh`: `resizeLenis()` вызывает `lenis.resize()`, сохраняя цель текущей smooth-инерции в пределах нового limit. Собственный helper Hero `refresh()` вызывает глобальный refresh и затем `resizeLenis()` ещё раз. Поэтому нельзя описывать resize Lenis как единственный однократный вызов. Последовательность обеспечивает повторное измерение после изменения pin-spacer, не создавая нового экземпляра.

При смене reduced-motion, compact или pointer media query Hero вызывает `rebuild()`. Сначала teardown снимает ticker/scroll callback, уничтожает Lenis, делает `context.revert()`, возвращает фото на место holder, снимает runtime-классы, восстанавливает исходные inline-стили и очищает измерения/ожидающий фокус. Затем выбирается новый режим. Обработчики документа/окна установлены один раз, не при каждом rebuild.

При изменении размеров FAQ ResizeObserver сбрасывает предыдущий timeout и через 120ms после последнего уведомления вызывает `ScrollTrigger.refresh(true)`. Глобальное событие refresh затем запускает существующий Hero `resizeLenis()`, пересчитывая limit без нового владельца скролла. Observer установлен один раз defer-модулем FAQ и работает также при закрытии/смене ответа; без ResizeObserver дополнительный путь пересчёта не устанавливается. Это интеграционное исправление подтверждённого дефекта, а не исходная механика поставки.

## Главная: Works v45 и Services v46

Works теперь имеет один `sc-works-timeline` с pin самой секции, `start:'top top'`, `pinSpacing:true`, `scrub:true`. Дистанция для шести работ: `round(5 × innerHeight × .92)`. Первая работа видна сразу; каждая последующая приезжает с `y:innerHeight`, масштабируется от `.885` (до 480px — `.9`) до `1` и закрывает предыдущую. Предыдущая карточка остаётся на месте; дополнительного последнего hold нет. Desktop glass-подписи используют ту же timeline. Resize инвалидирует функции геометрии; смена reduced motion вызывает полный `setup()` с kill trigger/timeline и очисткой transforms. Без зависимостей или при reduced motion работы идут вертикально в обычном потоке. Ширина сама по себе не выключает Works pin.

Services включает pin при `(min-width:851px) and (min-height:650px)`, доступных GSAP/ScrollTrigger, выключенном reduced motion и travel > 1px. `sc-services-entry` идёт от `top bottom` до `top top` с `scrub:true`, завершая подъём scene точно к началу pin. `sc-services-pin` двигает track на `-railTravel`, `scrub:.5`; дистанция `max(250,round(railTravel × 1.08))`. Один trigger владеет pin; отрицательного margin и ручного spacer нет.

Смена wide/reduced условий переключает режим через destroy/setup: сначала kill horizontal trigger/tween, затем entrance, очистка transforms/класса и прогресса. Обычный resize только пересчитывает геометрию. В native режиме лента скроллится горизонтально; кнопки, ArrowLeft/Right, Home/End и mouse drag управляют viewport. В pinned режиме кнопки и клавиши используют `window.scrollTo()` по диапазону существующего trigger, без второго Lenis. При keyboard focus карточки (`:focus-visible`) следующий RAF обнуляет скрытый `viewport.scrollLeft`, вычисляет прогресс по смещению карточки внутри track и мгновенно переводит документ к этому месту того же pin, затем вызывает `ScrollTrigger.update()`. Отдельной горизонтальной прокрутки под translated track не остаётся.

## Главная: Process, Reviews v58 и FAQ

Process не создаёт GSAP pin/Lenis. Hover/focus временно подсвечивает шаг, click/tap сохраняет выбор, повторный click снимает его. IntersectionObserver включает seen-класс. Пассивные scroll/resize через один ожидающий RAF двигают только иллюстрацию примерно от +10px до −10px, пока секция видима; reduced motion снимает lift.

Reviews сохраняет утверждённую v58. При `(min-width:1200px) and (min-height:800px)`, GSAP/ScrollTrigger и без reduced motion CSS задаёт секции `410svh` (минимум 2900px), scene — sticky высотой `100svh` (минимум 800px). Один `sc-testimonials-card-stream` идёт от `top 72%` до `bottom bottom` и не создаёт GSAP pin. Его прогресс интерполируется локальным RAF с временной константой .24s; цикл останавливается после достижения цели. Это рисование карточек, не управление прокруткой.

Четыре непрозрачные карточки движутся справа налево, автоматически поднимаются и увеличиваются у центра, исчезают только за краями clip; последняя остаётся видимой слева при release. Заголовок не гаснет. Небольшой transform предыдущего process banner также принадлежит Reviews и снимается teardown. При смене desktop/reduced условий teardown отменяет RAF, kill trigger, очищает стили карточек/heading/banner и возвращает native layout. На небольшом/низком экране native CSS задаёт горизонтальную snap-ленту; на широком reduced-motion экране остаётся обычная сетка без scroll-stream. Отдельные старые механики v57 сюда не возвращаются.

Интеграционное исправление keyboard focus не меняет draw/travel wheel/touch: `focusin` на `:focus-visible` в scroll-stream обнуляет native `scrollLeft` scene и cards, вычисляет положение выбранной карточки в центре и переводит документ к этому прогрессу существующего trigger. Затем `ScrollTrigger.update()` и `schedule(progress)` обновляют тот же stream. Ранее скрытая сцена могла самостоятельно прокрутиться по горизонтали и увести карточки из видимой области.

FAQ открывает максимум один из семи ответов и синхронизирует `aria-expanded`/`aria-hidden`; высота анимируется CSS grid. Desktop-вход content до 24px вычисляется на scroll/resize через RAF без pin и без fade. `faq-footer.js` сохраняет эту логику и ResizeObserver/refresh. Старые SMIL-волны, `--wave-scroll-y` и `pauseAnimations()` из него удалены; Footer обслуживается общими модулями v12.

## Каталог `/raboty/` v27

`raboty-motion.js` до отрисовки добавляет `html.sc-works-motion` только при no-preference. Одна `.works-surface` раскрывается за .84s; intro и grid имеют собственные короткие входы без второго фона. Header остаётся неподвижным. `raboty-effects.js` вычисляет смещение декоративного SVG по текущему bounding box поверхности, максимум 18px; пассивные scroll/resize сводятся к одному ожидающему RAF.

`raboty-scroll.js` создаёт один Lenis с параметрами `duration:1.2`, `lerp:0`, `smoothWheel:true`, `syncTouch:false`, `anchors:false`, `autoRaf:false`. GSAP ticker передаёт миллисекунды, ScrollTrigger получает update; без GSAP предусмотрен один RAF fallback, без Lenis — native scroll. Модули Hero/Works pin главной в каталоге не запускаются. Reduced motion снимает ticker, уничтожает Lenis и оставляет все карточки видимыми; обратное переключение создаёт максимум один экземпляр.

IntersectionObserver раскрывает `.case-card__open` один раз при threshold .08 и rootMargin `0px 0px -6% 0px`, с небольшим stagger по колонкам. CSS opacity/translate работают около 760ms на кнопке; hover-transform принадлежит внешней карточке и не конфликтует с reveal. Подъём −3px/640ms, тень 820ms, нижняя ссылка/стрелка переходят в #E44D1F за 240ms. Стрелка и изображение не двигаются, cursor-follow отсутствует.

`raboty-cards.js` берёт название, тип, описание и изображение из выбранной карточки и открывает native dialog. Класс `html.sc-dialog-open` блокирует document scroll; `data-lenis-prevent` сохраняет нативную прокрутку содержимого окна. Событие `sc:dialog` останавливает/возобновляет тот же Lenis. ESC, крестик, кнопка возврата и клик по backdrop закрывают окно; close снимает блокировку и возвращает фокус исходной карточке с preventScroll.

Плавные same-page anchors фильтруются отдельно от внешних/модифицированных ссылок. После scrollTo onComplete целевая секция получает фокус через временный tabindex −1, который восстанавливается на blur. Keyboard scroll сбрасывает ожидающий фокус и заканчивает инерцию. Это исправляет подтверждённый дефект архивного Works, в котором фокус оставался в хедере.

## Общий Footer v12

`footer-waves.js` создаёт ровно три `.rwb-layer` в единственном `#roveiaWaveBg`. Исходные функции/seed и параметры v12 сохранены: desktop высоты 600/500/350px, скорости .50/.60/.70, blur 16px с множителями 1.2/1/.8, цвет #218AFF. До 600px основание увеличивается с 200 до 250px. Path рассчитывается исходной синусоидальной моделью и кривыми; постоянное движение не зависит от scroll и не меняет его координату. SMIL и второй CSS ambient drift не подключаются.

IntersectionObserver запускает RAF только при видимом фоне волн, уход из viewport и скрытие вкладки его останавливают. При reduced motion рисуется статичный frame(0); изменение настройки также обрабатывается. Dataset-маркер защищает от повторной инициализации.

`footer-reveal.js` один раз включает CTA opacity 0→1 и scale .8→1 без translateY, .92s с bezier(.22,.61,.36,1). Нижняя навигация и copyright имеют независимый opacity fade 2.55s. CTA/bottom используют исходный threshold .01 и rootMargin −7%; у последней строки `.sc-footer__fine` отдельный observer с rootMargin 0. Это устраняет подтверждённый в архиве дефект: у max scroll на 390×844 строка не пересекала прежний порог и оставалась прозрачной. Геометрия и время анимации не изменены. Reduced motion показывает контент сразу и отключает pending observers; повторное подключение не сбрасывает reveal.

## Навигация и диагностика

Capture-обработчик Hero на главной фильтрует обычные same-page anchor-клики и передаёт их единственному Lenis; history сохраняет hash, фокус переносится после завершения. Внешние/модифицированные/download/new-tab ссылки остаются браузеру. Без Lenis якоря нативны. Keyboard scroll заканчивает инерцию, затем обрабатывается браузером; popstate сбрасывает ожидающий фокус и перезапускает наблюдение Lenis. Initial hash применяется после readiness Hero. `main.js` теперь управляет только hover/focus/tap-превью аудиторий.

`site-header.js` обслуживает общее меню на обеих страницах. Escape закрывает панель и возвращает фокус кнопке, если он был внутри; ссылка, внешний pointerdown и переход выше 850px также закрывают меню. Header «Работы» ведёт на `/raboty/`, а не на главный pin `#works`; Services/FAQ с каталога ведут к главной, Contacts — к текущему Footer.

`window.__synthecoreScrollQA`, `__synthecoreWorksQA`, `__synthecoreServicesQA`, `__synthecoreProcessQA`, `__synthecoreTestimonialsQA` дают состояние главной; `__synthecoreWorksScrollQA` — каталога (engine, duration, число раскрытых/pending карточек). Эти значения помогают воспроизводить тесты, но не заменяют реальную прокрутку, переходы, снимки, resize, FAQ/dialog и reduced-motion приёмку.
