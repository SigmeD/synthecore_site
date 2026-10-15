# Hero → «С кем работаем»: две последовательные фазы

> **Архив до рефакторинга v31.** Этот документ сохраняет постановку, реализацию и результаты своей итерации. Его слова «актуально» и «проверено» не являются приёмкой текущей страницы. Текущий вход: [старт v31](01_NEW_CHAT_START.md), [QA v31](QA_V31.md). Пути «локальный артефакт» обозначают материалы вне Git, которые могут отсутствовать в клоне.

> Исторический отчёт. Отдельная opacity/transform-анимация отменена новым видеоаудитом. Актуальная геометрия и локальная контрольная точка описаны в [hero-gate-verification.md](hero-gate-verification.md).

14 октября 2026. Исправление внесено в локальный проект. Видеозапись исключена по последнему сообщению пользователя.

## Результат

Фаза1 — прежний закреплённый Hero и прежнее раскрытие фотографии, затемнение и цвета текста. Следующее содержимое невидимо до конца этого диапазона. В кадре Б фотография полностью раскрыта, но heading и направления не показаны.

Фаза2 — отдельный GSAP timeline/ScrollTrigger **без pin**, с start ровно от конца Hero ScrollTrigger. Только дополнительный скролл даёт ему положительный progress. Hero начинает естественно уходить вверх, heading появляется первым с плавным translateY24→0 и opacity, затем три направления с translateY18→0 и небольшим stagger. Используется power2.out, без spring/back/elastic. При reverse фаза2 сначала возвращается к скрытому состоянию, затем фотография уменьшается в фазе1.

Фаза2 занимает min(260px,0.3×viewportHeight) существующей прокрутки. Она не добавляет высоту или spacer. Это смежный диапазон после раскрытия, без промежуточной пустой паузы. Phase1 end остался1.1×viewportHeight:845/1188/2376px. Lenis и единственный ticker сохранены; scrub=true не добавляет независимое запаздывание изображения после освобождения pin.

Все секции сохраняют своё место в потоке. Содержимое аудитории скрывается через autoAlpha/visibility, а не переносится ниже viewport. На высоком экране оно геометрически может находиться в окне, но не отображается до фазы2. Следующие за аудиториями существующие секции тоже временно скрыты в интро, чтобы третий блок не появился раньше второго; их видимость возвращается после heading. Высота Hero на4K остаётся968px; ниже баннера в кадре Б видна исходная свободная часть окна. Дополнительной высоты/отступа/дистанции ожидания не создаётся.

Родитель аудитории inert при progress0, поэтому невидимые кнопки не получают focus/pointer. Его исходное состояние восстанавливается при teardown. Обе анимации и временные inline-стили входят в один GSAP context, который возвращает исходную видимость в reduced motion, mobile и fallback. Код hover/focus/tap-превью в js/main.js не редактировался; скролл по-прежнему не выбирает категории.

## Контрольные кадры при одинаковом viewport

| Viewport | А: раскрытие | Б: полностью раскрыто, второй блок скрыт | В: дальнейший скролл |
|---|---|---|---|
|1366×768|А (локальный артефакт: `output/playwright/hero-two-phases/1366x768-A.png`)|Б (локальный артефакт: `output/playwright/hero-two-phases/1366x768-B.png`)|В (локальный артефакт: `output/playwright/hero-two-phases/1366x768-V.png`)|
|1920×1080|А (локальный артефакт: `output/playwright/hero-two-phases/1920x1080-A.png`)|Б (локальный артефакт: `output/playwright/hero-two-phases/1920x1080-B.png`)|В (локальный артефакт: `output/playwright/hero-two-phases/1920x1080-V.png`)|
|3840×2160|А (локальный артефакт: `output/playwright/hero-two-phases/3840x2160-A.png`)|Б (локальный артефакт: `output/playwright/hero-two-phases/3840x2160-B.png`)|В (локальный артефакт: `output/playwright/hero-two-phases/3840x2160-V.png`)|

Дополнительно сохранены heading-first — заголовок уже проявляется, opacity направлений ещё0 — и reverse-B/reverse-A/reverse-start.

Контрольные кадры [Roveia](https://www.roveia.com/) при этих же размерах, снятые ранее в этой сессии: 1366: конец (локальный артефакт: `output/playwright/hero-handoff/roveia-1366x768-complete.png`), 1920: конец (локальный артефакт: `output/playwright/hero-handoff/roveia-1920x1080-complete.png`), 1920: переход (локальный артефакт: `output/playwright/hero-handoff/roveia-1920x1080-transition.png`), 4K: конец (локальный артефакт: `output/playwright/hero-handoff/roveia-3840x2160-complete.png`). На4K live-reference показывал следующий heading уже при раскрытии; для нашего проекта соблюдено более строгое требование пользователя. Высоту Roveia не переносили в SyntheCore, сравнение разных viewport не использовалось.

## Проверки

acceptance.json (локальный артефакт: `output/playwright/hero-two-phases/acceptance.json`): **3/3 passed** на1366×768,1920×1080,3840×2160. На каждом размере около1280 rAF-состояний с реальными wheel events: stop посередине, быстрый overshoot конца pin, reverse, серия медленных импульсов вниз и обратно. Каждое состояние проверяет порядок фаз с учётом visibility/opacity всех предков. При видимом heading фотография уже полностью раскрыта и физический scroll больше pinEnd. В фазе1 opacity heading/направлений/следующего контента0; контент inert. Ошибок JS и horizontal overflow нет.

Контрольные состояния подтверждают совпадение handoffStart и pinEnd, полный размер image scale1 и затемнение0.98 в Б, появление heading перед направлениями, прежнюю высоту Hero и постоянную высоту документа. После полного появления heading/направлений зазор от Hero до начала аудитории остаётся около14/18px. Фаза2 не создаёт второго pin-spacer. baseline-failures.json (локальный артефакт: `output/playwright/hero-two-phases/baseline-failures.json`) фиксирует отсутствие такого gate до изменения кода.

lifecycle.json (локальный артефакт: `output/playwright/hero-two-phases/lifecycle.json`): resize во время фазы1 пересчитывает границу входа; при обратном проходе скрываемые controls теряют focus; reduced motion снимает оба trigger и восстанавливает видимость всех секций; mobile не оставляет inert/hidden; прямые #audiences/#services корректно показывают конечное состояние, preview продолжает работать.

Общая `scripts/verify-hero.cjs`: **7 cases passed**, без ошибок — три desktop, два mobile, отсутствие Lenis, отсутствие GSAP. Проверены anchors, keyboard, stop/reverse, release, cleanup и resize. `scripts/verify-audience-preview.cjs`: **11/11 passed**, включая keyboard, tap toggle, reduced motion, отсутствие библиотек и неподвижный курсор при скролле. Новый handoff не активирует категории.

`scripts/check-project.cjs` подтверждает побайтовую сохранность CSS, HTML, js/main.js и hero-geometry.js относительно начала текущего исправления. В Hero сохранились функции measure/renderTones, keyboard/anchor navigation и исходные tweens раскрытия/затемнения. Проверены11 хешей ассетов/библиотек и12 HTTP-ресурсов, совпадающих с диском. `scripts/check-hero-geometry.cjs`:12 сочетаний,60 crop-состояний passed.

Применены Chromium viewport/touch emulation. Реальные телефоны и другие браузерные движки не проверялись. Новое видео не снималось и не кодировалось.

## Файлы текущего исправления

Изменены:

- js/hero-scroll.js — отдельная фаза появления, lifecycle cleanup и диагностические поля handoff.
- scripts/check-project.cjs — сохранность дизайна/геометрии/карточек при разрешённой новой фазе.
- README.md — актуальное описание двух фаз.
- docs/hero-handoff-verification.md — прежний подход помечен историческим и связан с текущим решением.

Добавлены:

- scripts/verify-hero-two-phases.cjs — кадры А/Б/В и строгая rAF-приёмка.
- scripts/verify-hero-two-phases-lifecycle.cjs — resize/cleanup/reverse focus/anchors.
- docs/hero-two-phases-verification.md — текущий протокол.
- docs/superpowers/specs/2026-10-14-hero-two-phases-design.md — спецификация.
- docs/superpowers/plans/2026-10-14-hero-two-phases.md — исполненный план.

Контрольная копия — backup/hero-two-phases-before-2026-10-14/. Новые скриншоты и JSON — output/playwright/hero-two-phases/. Git отсутствует. CSS, HTML, библиотеки, тексты, изображения и код карточек не менялись.

```powershell
node scripts/verify-hero-two-phases.cjs
node scripts/verify-hero-two-phases-lifecycle.cjs
$env:PLAYWRIGHT_CDP_URL = 'http://127.0.0.1:9222'
node scripts/verify-hero.cjs
node scripts/verify-audience-preview.cjs
node scripts/check-project.cjs
node scripts/check-hero-geometry.cjs
```

Прежний scripts/verify-hero-handoff.cjs проверяет физическое нахождение heading ниже окна и относится к прошлому полноэкранному предложению. Текущая приёмка проверяет фактическую видимость/порядок фаз при неизменной геометрии.
