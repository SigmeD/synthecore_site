# Прокрутка и события v60

Описание основано на исполняемых `js/hero-scroll.js`, `main.js`, `works.js`, `services.js`, `process.js`, `testimonials.js`, `faq-footer.js` и подключённых CSS. Это описание реализации; результаты запуска — в [QA v60](QA_V60.md). Старые wheel-gate, checkpoint с обязательным новым жестом и шесть независимых Works tween относятся к историческим итерациям.

## Hero и единственный Lenis

Hero ждёт fonts/image readiness, сохраняет исходные inline-стили и вызывает `rebuild()`. Анимация разрешена при GSAP/ScrollTrigger/геометрии, готовом фото, точном hover-указателе, выключенном reduced motion и вне compact media query `(max-width:850px), (min-aspect-ratio:3/1)`. Иначе сохраняется native Hero. Недоступный Lenis сам по себе не запрещает GSAP с нативной прокруткой.

`rebuild()` перемещает исходное фото в Hero, оставляет holder, измеряет crop/текст и создаёт context. `synthecore-hero` закрепляет `#imageScrollSticky` с `pinSpacing:true` на `round(innerHeight × 1.1)`, `scrub:true`, `invalidateOnRefresh:true`. Маска и равномерный scale завершают reveal на `5/6` timeline; остальные tween затемняют фото, скрывают caption и меняют цвет текста по покрытию. Размеры баннера не анимируются. `synthecore-audience-parallax` с `scrub:.55` движет только `.audience-copy` от `clamp(80px,10vh,140px)` к нулю за `round(innerHeight × .7)` после конца Hero pin. Появление занимает начальное расстояние смещения.

Только Hero создаёт Lenis: `duration:1.2`, `lerp:0`, `smoothWheel:true`, `syncTouch:false`, `anchors:false`, `autoRaf:false`. Один GSAP ticker callback передаёт `time × 1000` в `lenis.raf`; `lenis.on('scroll')` вызывает `ScrollTrigger.update()`, `lagSmoothing(0)` отключает коррекцию ticker. При внешнем сдвиге scroll больше 2px текущая инерция синхронизируется с браузером. Второго Lenis, независимого Lenis RAF или wheel-gate нет.

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

## Works v45 и Services v46

Works теперь имеет один `sc-works-timeline` с pin самой секции, `start:'top top'`, `pinSpacing:true`, `scrub:true`. Дистанция для шести работ: `round(5 × innerHeight × .92)`. Первая работа видна сразу; каждая последующая приезжает с `y:innerHeight`, масштабируется от `.885` (до 480px — `.9`) до `1` и закрывает предыдущую. Предыдущая карточка остаётся на месте; дополнительного последнего hold нет. Desktop glass-подписи используют ту же timeline. Resize инвалидирует функции геометрии; смена reduced motion вызывает полный `setup()` с kill trigger/timeline и очисткой transforms. Без зависимостей или при reduced motion работы идут вертикально в обычном потоке. Ширина сама по себе не выключает Works pin.

Services включает pin при `(min-width:851px) and (min-height:650px)`, доступных GSAP/ScrollTrigger, выключенном reduced motion и travel > 1px. `sc-services-entry` идёт от `top bottom` до `top top` с `scrub:true`, завершая подъём scene точно к началу pin. `sc-services-pin` двигает track на `-railTravel`, `scrub:.5`; дистанция `max(250,round(railTravel × 1.08))`. Один trigger владеет pin; отрицательного margin и ручного spacer нет.

Смена wide/reduced условий переключает режим через destroy/setup: сначала kill horizontal trigger/tween, затем entrance, очистка transforms/класса и прогресса. Обычный resize только пересчитывает геометрию. В native режиме лента скроллится горизонтально; кнопки, ArrowLeft/Right, Home/End и mouse drag управляют viewport. В pinned режиме кнопки и клавиши используют `window.scrollTo()` по диапазону существующего trigger, без второго Lenis. При keyboard focus карточки (`:focus-visible`) следующий RAF обнуляет скрытый `viewport.scrollLeft`, вычисляет прогресс по смещению карточки внутри track и мгновенно переводит документ к этому месту того же pin, затем вызывает `ScrollTrigger.update()`. Отдельной горизонтальной прокрутки под translated track не остаётся.

## Process, Reviews v58, FAQ и волны

Process не создаёт GSAP pin/Lenis. Hover/focus временно подсвечивает шаг, click/tap сохраняет выбор, повторный click снимает его. IntersectionObserver включает seen-класс. Пассивные scroll/resize через один ожидающий RAF двигают только иллюстрацию примерно от +10px до −10px, пока секция видима; reduced motion снимает lift.

Reviews сохраняет утверждённую v58. При `(min-width:1200px) and (min-height:800px)`, GSAP/ScrollTrigger и без reduced motion CSS задаёт секции `410svh` (минимум 2900px), scene — sticky высотой `100svh` (минимум 800px). Один `sc-testimonials-card-stream` идёт от `top 72%` до `bottom bottom` и не создаёт GSAP pin. Его прогресс интерполируется локальным RAF с временной константой .24s; цикл останавливается после достижения цели. Это рисование карточек, не управление прокруткой.

Четыре непрозрачные карточки движутся справа налево, автоматически поднимаются и увеличиваются у центра, исчезают только за краями clip; последняя остаётся видимой слева при release. Заголовок не гаснет. Небольшой transform предыдущего process banner также принадлежит Reviews и снимается teardown. При смене desktop/reduced условий teardown отменяет RAF, kill trigger, очищает стили карточек/heading/banner и возвращает native layout. На небольшом/низком экране native CSS задаёт горизонтальную snap-ленту; на широком reduced-motion экране остаётся обычная сетка без scroll-stream. Отдельные старые механики v57 сюда не возвращаются.

Интеграционное исправление keyboard focus не меняет draw/travel wheel/touch: `focusin` на `:focus-visible` в scroll-stream обнуляет native `scrollLeft` scene и cards, вычисляет положение выбранной карточки в центре и переводит документ к этому прогрессу существующего trigger. Затем `ScrollTrigger.update()` и `schedule(progress)` обновляют тот же stream. Ранее скрытая сцена могла самостоятельно прокрутиться по горизонтали и увести карточки из видимой области.

FAQ открывает максимум один из семи ответов и синхронизирует `aria-expanded`/`aria-hidden`; высота анимируется CSS grid. Desktop-вход content до 24px вычисляется на scroll/resize через RAF без pin и без fade. Три footer SVG независимо меняют path в циклах 24/21/18 секунд, CSS добавляет ambient transforms. Скролл лишь меняет `--wave-scroll-y`; остановка прокрутки не останавливает ambient SVG. Reduced motion убирает scroll-lift, отключает CSS-движение и вызывает `pauseAnimations()` для SVG.

## Навигация и диагностика

Capture-обработчик Hero фильтрует обычные same-page anchor-клики и передаёт их единственному Lenis; history сохраняет hash, фокус переносится после завершения. Внешние/модифицированные/download/new-tab ссылки остаются браузеру. Без Lenis якоря нативны. Keyboard scroll заканчивает текущую инерцию, затем обрабатывается браузером; popstate сбрасывает ожидающий фокус и перезапускает наблюдение Lenis. Initial hash применяется после readiness Hero. `main.js` независимо управляет меню и hover/focus/tap-превью аудиторий. Escape закрывает открытое меню; если фокус находился внутри скрываемой панели, он возвращается кнопке меню через `focus({preventScroll:true})`.

`window.__synthecoreScrollQA`, `__synthecoreWorksQA`, `__synthecoreServicesQA`, `__synthecoreProcessQA`, `__synthecoreTestimonialsQA` дают диагностическое состояние. Их значения помогают воспроизводить тесты, но не заменяют реальную прокрутку вниз/вверх, переходы, снимки, resize, FAQ и reduced-motion приёмку.
