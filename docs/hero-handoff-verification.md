# Hero → «С кем работаем»: синхронизация и решение по высоте

> **Архив до рефакторинга v31.** Этот документ сохраняет постановку, реализацию и результаты своей итерации. Его слова «актуально» и «проверено» не являются приёмкой текущей страницы. Текущий вход: [старт v31](01_NEW_CHAT_START.md), [QA v31](QA_V31.md). Пути «локальный артефакт» обозначают материалы вне Git, которые могут отсутствовать в клоне.

**Исторический отчёт предыдущего подхода.** Исправленная постановка реализована отдельной фазой появления содержимого при прежней высоте Hero: [актуальная проверка](hero-two-phases-verification.md). Увеличение баннера не применялось; ожидание решения по высоте больше не актуально. Видеозапись в текущей задаче отменена пользователем.

14 октября 2026. **Задача целиком не завершена: требуется уточнение допустимой высоты Hero.** В локальный проект внесено только устранение запаздывания анимации; полноэкранный вариант подготовлен и проверен в изолированных браузерных контекстах, CSS сайта не изменён.

## Внесено в текущий сайт

В js/hero-scroll.js `scrub: 1` заменён на `scrub: true`. Lenis по-прежнему единолично сглаживает физическую прокрутку: duration1.2, lerp0, один GSAP ticker и прежний ScrollTrigger.update. Pin и раскрытие теперь используют один и тот же прогресс. Исчезло второе независимое догоняющее сглаживание, из-за которого Hero освобождался раньше, чем изображение доходило до конечного состояния.

Сохранены start `top top`, end1.1×innerHeight, pin=true, pinSpacing=true и остальные параметры. Затемнение, mask/crop, цвета, текст, CTA, поля, скругления, hero-geometry.js, HTML и audience hover/focus/tap не менялись. Таймеры, scroll lock, отрицательные margins и искусственная пауза не добавлялись.

## Почему одного изменения scrub недостаточно

В момент освобождения pin следующая секция занимает своё естественное место после баннера. Если баннер существенно ниже окна, её заголовок уже внутри viewport. Изменение длины pin не устраняет это: в точке unpin положение следующего блока определяется высотой закреплённого элемента и прежними полями.

| Viewport | Текущая высота Hero | Заголовок аудитории при полном раскрытии | Требование «ещё не виден» |
|---|---:|---:|---|
|1366×768|706,55 px|814 px|выполнено|
|1920×1080|801,36 px|919,08 px|не выполнено|
|3840×2160|968 px|1116 px|не выполнено|

Baseline: before.json (локальный артефакт: `output/playwright/hero-handoff/before.json`). Проблема подтверждена кадром 1920 (локальный артефакт: `output/playwright/hero-handoff/before-1920x1080-1.png`) и кадром 4K (локальный артефакт: `output/playwright/hero-handoff/before-3840x2160-1.png`).

Пользователю отправлено обязательное уточнение между двумя вариантами: разрешить Hero высотой с окно при сохранении полей, скруглений и координат текста; либо сохранять высоту Hero и скрывать следующий блок до завершения раскрытия, принимая его последующее появление на уже находящемся внутри окна естественном месте. Ответ не получен; зависимое изменение дизайна не применялось.

## Проверенный полноэкранный вариант

В browser route к текущему CSS добавляется один scoped selector, только для активного desktop-режима:

```css
#imageScrollSticky.is-image-animated > .hero {
  height: calc(100svh - 2 * var(--hero-edge));
}
```

На диске этого правила нет. Оно изменяет высоту баннера, поэтому требует решения по ограничению «не менять утверждённый дизайн». Вариант не создаёт отдельную пустую область: сам баннер и его фотография занимают высоту окна за вычетом существующих полей. Pin заканчивается вместе с раскрытием, затем начинается обычное движение документа. Статьи аудитории не выбираются от скролла.

proposal-acceptance.json (локальный артефакт: `output/playwright/hero-handoff/proposal-acceptance.json`): **3/3 passed**. Снято около 1190 реальных rAF-состояний на каждый viewport с быстрым пересечением pin, остановкой колеса, медленной серией импульсов, разворотом и обратным проходом. Заголовок всегда ниже окна во время раскрытия; при уходе Hero визуальный прогресс уже1. Начальные координаты h1 и CTA относительно baseline изменились на0 px на всех трёх размерах. После unpin зазор от нижней границы Hero до начала следующей секции остаётся прежним — около14/18 px.

| Viewport | Полное раскрытие варианта | Дальнейший скролл | Roveia: полное раскрытие |
|---|---|---|---|
|1366×768|Полный Hero (локальный артефакт: `output/playwright/hero-handoff/proposal-1366x768-complete.png`)|Переход (локальный артефакт: `output/playwright/hero-handoff/proposal-1366x768-transition.png`)|Референс (локальный артефакт: `output/playwright/hero-handoff/roveia-1366x768-complete.png`)|
|1920×1080|Полный Hero (локальный артефакт: `output/playwright/hero-handoff/proposal-1920x1080-complete.png`)|Переход (локальный артефакт: `output/playwright/hero-handoff/proposal-1920x1080-transition.png`)|Референс (локальный артефакт: `output/playwright/hero-handoff/roveia-1920x1080-complete.png`)|
|3840×2160|Полный Hero (локальный артефакт: `output/playwright/hero-handoff/proposal-3840x2160-complete.png`)|Переход (локальный артефакт: `output/playwright/hero-handoff/proposal-3840x2160-transition.png`)|Референс (локальный артефакт: `output/playwright/hero-handoff/roveia-3840x2160-complete.png`)|

Для всех размеров также сохранены start/middle/reverse-complete/reverse-middle/reverse-start.

## Сопоставление с live Roveia

Live [Roveia](https://www.roveia.com/) открыт на всех трёх одинаковых viewport; контроллер проверен после реальной загрузки и появления Hero ScrollTrigger. Данные — reference.json (локальный артефакт: `output/playwright/hero-handoff/reference.json`). На1920 высота баннера968 px, заголовок следующего блока в конечном состоянии y1112, то есть ниже окна1080. На4K высота баннера также968 px и заголовок y1112 уже виден в окне2160. Следовательно, строгая последовательность на4K из задания строже текущего поведения референса. Этот результат не скрыт и не заменён приблизительными замерами скриншотов другого размера.

## Проверки текущей версии

acceptance.json (локальный артефакт: `output/playwright/hero-handoff/acceptance.json`): strict handoff **1366 passed;1920 и3840 failed** из-за появления заголовка до конца раскрытия. Запаздывание прогресса устранено, но ограничения геометрии остаются. baseline-failures.json (локальный артефакт: `output/playwright/hero-handoff/baseline-failures.json`) фиксирует исходное запаздывание на всех трёх размерах.

Общая `scripts/verify-hero.cjs` после обновления ожидания scrub-синхронизации: **7 cases passed**, ошибок нет — три desktop, два mobile, отсутствие Lenis и отсутствие GSAP. Проверены stop/reverse, release, anchors, keyboard, reduced motion и resize. Это общая регрессия Hero, а не доказательство выполнения strict handoff на1920/4K.

`scripts/check-project.cjs` подтверждает, что js/main.js сохранён побайтово относительно начала этой задачи, HTML и CSS вне ранее согласованного audience-блока сохранены, в Hero-контроллере изменён только scrub и его комментарий. Проверяются11 хешей и12 HTTP-ресурсов. `scripts/check-hero-geometry.cjs`:12 сочетаний,60 crop-состояний passed.

## Запись вниз и обратно

- Текущий локальный сайт (локальный артефакт: `output/playwright/hero-handoff/current/down-up.webm`) — исправленная синхронизация при прежней высоте; геометрическая проблема1920 остаётся.
- Полноэкранный вариант (локальный артефакт: `output/playwright/hero-handoff/proposal-full-viewport/down-up.webm`) — проверенное предложение, не применённое к CSS сайта.

Оба видео — реальные viewport-кадры Chromium1920×1080 с wheel-прокруткой вниз и обратно, около12 секунд, ресэмплирование к20fps по timestamps. Исходный CDP screencast обрезал физическую browser surface по высоте; поэтому запись переснята через полные viewport screenshots и закодирована заново. Пропорции1920×1080 сохраняются. Кадры/timestamps — recording.json и hero-frames в соответствующих каталогах; проверка декодирования и размеры — video-verification.json (локальный артефакт: `output/playwright/hero-handoff/video-verification.json`). Это запись поведения, а не измерение FPS приложения.

## Файлы

Изменены:

- js/hero-scroll.js — синхронизация scrub.
- scripts/verify-hero.cjs — проверка равенства прогресса вместо прежнего ожидания запаздывания.
- scripts/check-project.cjs — разрешённое изменение scrub и сохранность audience JS.
- README.md — актуальные настройки и ссылка на этот незавершённый handoff.

Добавлены:

- scripts/verify-hero-handoff.cjs — strict acceptance, baseline и изолированное предложение.
- scripts/capture-hero-handoff-reference.cjs — контрольные кадры live Roveia.
- scripts/record-hero-handoff.cjs — полная viewport-запись текущей версии/предложения.
- scripts/prepare-handoff-recording.cjs — подготовка real-frame MJPEG.
- scripts/check-handoff-videos.cjs — декодирование и контроль размеров видео.
- docs/hero-handoff-verification.md — этот протокол.

CSS, HTML, hero-geometry.js и audience-логика не менялись. Backup — backup/hero-handoff-before-2026-10-14/. Артефакты — output/playwright/hero-handoff/. Git отсутствует.

```powershell
node scripts/verify-hero-handoff.cjs
node scripts/verify-hero-handoff.cjs --proposal
$env:PLAYWRIGHT_CDP_URL = 'http://127.0.0.1:9222'
node scripts/verify-hero.cjs
node scripts/capture-hero-handoff-reference.cjs
node scripts/check-project.cjs
node scripts/check-hero-geometry.cjs
node scripts/check-handoff-videos.cjs
```

Первая команда ожидаемо возвращает failed, пока решение по высоте не применено. Proposal-команда использует подмену только CSS-ответа в своём browser context и не редактирует сайт.
