# SyntheCore — Hero: изменения и браузерная приёмка

> **Архив до рефакторинга v31.** Этот документ сохраняет постановку, реализацию и результаты своей итерации. Его слова «актуально» и «проверено» не являются приёмкой текущей страницы. Текущий вход: [старт v31](01_NEW_CHAT_START.md), [QA v31](QA_V31.md). Пути «локальный артефакт» обозначают материалы вне Git, которые могут отсутствовать в клоне.

> Этот протокол и видео относятся к задаче Hero до следующей доработки блока аудиторий. Текущее состояние «С кем работаем», семь новых browser cases и кадры до/после описаны в [отдельном отчёте](audiences-verification.md). Hero-контроллеры сохранены.

14 октября 2026 г. **Реализация и браузерная проверка завершены.** Пользователь запустил отдельный Chromium; доступ по CDP подтверждён. База v23.1; новый номер версии и пользовательское утверждение сборки не назначались.

Среда: Windows, Chrome 149.0.7827.55, Playwright-core 1.61.1, CDP http://127.0.0.1:9222. Сайт http://127.0.0.1:4173/. Все результаты ниже относятся к этому браузеру и эмуляции указанных viewport/touch.

## Изменённые и добавленные файлы

| Файлы | Изменение |
|---|---|
| index.html | Локальные GSAP/ScrollTrigger/Lenis, Lenis CSS и два модуля Hero |
| css/main.css | Удалён конфликтующий sticky/smooth/expander; слой, маска, transform; устранены перекрытие заголовка и mobile/reduced CSS-конфликты |
| js/main.js | Старый Hero удалён; меню и карточки сохранены |
| js/hero-scroll.js | Одна Timeline/Lenis, refresh, режимы, якоря, клавиатура, диагностика |
| js/hero-geometry.js | Crop, равномерный масштаб, покрытие текста |
| assets/vendor/* | Lenis 1.3.26 JS/CSS/license; GSAP/ScrollTrigger 3.12.5 JS/package/license |
| scripts/check-hero-geometry.cjs, check-project.cjs | Геометрия, сохранность разметки/обработчиков/ассетов, HTTP |
| scripts/verify-hero.cjs, check-adversarial.cjs | Матрица и дополнительные стресс-сценарии |
| scripts/start-chromium.ps1, check-browser-access.cjs; start-chromium.bat | Запуск отдельного Chromium и проверка доступа |
| scripts/record-hero.cjs, prepare-recording.cjs, capture-evidence.cjs | Реальные CDP-кадры, подготовка видео, проверка декодирования |
| scripts/capture-reference.cjs, inspect-reference.cjs, inspect-hero.cjs | Исследование и кадры референса/локального Hero |
| scripts/vendor-dependencies.cjs, docs/vendor-manifest.json | Воспроизводимые фиксированные vendor-файлы и SHA-256 |
| README.md, docs/00_MASTER_CONTEXT.md, 01_NEW_CHAT_START.md, v23-animation-notes.md, verification.md, chromium-access.md | Актуальный контекст, реализация и результаты |
| docs/superpowers/specs/2026-10-14-hero-scroll-design.md, plans/2026-10-14-hero-scroll.md | Решение и исполненный план |
| backup/v23.1-before-lenis/* | Контрольная исходная копия HTML/CSS/JS/README |
| output/playwright/* | JSON, реальные screenshots/кадры, референс, WebM; профиль отдельного браузера |

Утверждённая HTML-разметка, тексты, типографические размеры, четыре изображения и обработчики меню/карточек сохранены. CSS-положение исправлено только там, где исторические переопределения создавали перекрытия: низкий desktop, mobile и desktop reduced motion. Размеры карточек, новые секции и серверные скрипты не перерабатывались.

## Технический результат

Один GSAP ticker обновляет Lenis; событие scroll обновляет ScrollTrigger. Lenis duration 1.2, lerp 0, smoothWheel true, syncTouch false, autoRaf false. Hero: pin/pinSpacing true, scrub 1, start top top, end 1,1 высоты окна, invalidateOnRefresh true.

Фотография раскрывается clip-path до внутренних границ Hero и масштабируется равномерно через явные scaleX/scaleY. Width/height записываются при setup/refresh. Текст Hero, включая заголовок и нижние подписи, использует background-clip:text по горизонтальным/вертикальным краям маски: тёмные буквы на голубом, белые на фото, без копий текста и подложек. Затемнение завершается к 30% раскрытия для контраста на светлых участках снимка. После pin Hero движется вместе с документом, следующий заголовок входит без дополнительного spacer-хвоста.

Встроенные anchors false: обычные ссылки проходят через один фильтр к тому же Lenis, с hash/focus. Reduced motion и mobile сохраняют статичное фото/нативную прокрутку. Инициализация ждёт шрифты и decode; resize/orientation пересчитывают геометрию.

## Подтверждённые проверки

| Проверка | Результат |
|---|---|
| Исходные HTML/CSS/JS | Backup SHA-256 совпали с D:\downloads\synthecore-v23-1-fixed.zip |
| Синтаксис | node --check для JS/CJS; PowerShell parser для startup |
| Геометрия | 12 сочетаний панели/пропорций, 60 промежуточных crop-состояний и zero-size guards |
| Разметка и меню/карточки | Сравнение с backup прошло |
| Изображения/библиотеки | 11 SHA-256 совпали |
| Локальные ресурсы | 12 CSS/JS/WebP HTTP 200; побайтово совпали с диском |
| Chromium | Реальный isolated context, страница загрузилась, engine lenis-gsap-scrolltrigger |
| JS | Ошибок в выполненной матрице и adversarial нет |

## Матрица браузера

| Viewport | Режим и проверки | Результат |
|---|---|---|
| 1366×768 | Pin 845 px; 0/25/50/75/100%, wheel-stop, reverse, release | Прошёл |
| 1920×1080 | Pin 1188 px; те же стадии и взаимодействия | Прошёл |
| 3840×2160 | Pin 2376 px; те же стадии, одинаковые scaleX/scaleY | Прошёл |
| 390×844 | Нативный скролл, фото, меню, touch-карточки | Прошёл |
| 430×932 | Нативный скролл, фото, меню, touch-карточки | Прошёл |

Desktop дополнительно проверяет монотонное затухание после остановки колеса, отсутствие горизонтального overflow, стабильную высоту документа во время pin, CTA поверх фото, отсутствие карточки под неподвижным курсором, PageDown, keyboard/Escape, anchors, reduced motion и возврат в анимационный режим, desktop→mobile→desktop без лишнего spacer.

На release отступ между нижней границей Hero и заголовком «С кем работаем» остаётся в пределах 145 px (принимается существующий межблочный интервал, без дополнительной пустой секции). При reduced motion исчезает spacer, фото возвращается в сетку, заголовок расположен ниже хедера.

Машинная матрица (локальный артефакт: `output/playwright/acceptance.json`): семь случаев passed, errors пуст. Два дополнительных случая — отсутствие Lenis и отсутствие GSAP. Доступ (локальный артефакт: `output/playwright/browser-access.json`): connected.

Промежуточные кадры сохранены с именами viewport-progress.png; например 25% (локальный артефакт: `output/playwright/1920x1080-25.png`), 50% (локальный артефакт: `output/playwright/1920x1080-50.png`), 75% (локальный артефакт: `output/playwright/1920x1080-75.png`), release (локальный артефакт: `output/playwright/1920x1080-release.png`), mobile (локальный артефакт: `output/playwright/430x932-native.png`). Кадры просмотрены; фотография, маска, поля, оранжевый акцент, хедер и кнопки сохраняются.

## Адверсальная проверка

adversarial.json (локальный артефакт: `output/playwright/adversarial.json`) — пять пройденных дополнительных случаев, errors пуст:

- Resize во время активного pin: ширины слоя/баннера совпали, scaleX=scaleY, один spacer.
- Wheel ±20000: пересечение границ, обратная прокрутка вернула scroll 0 без отскока.
- Anchor focus и Back восстановили фокус/hash/позицию; Ctrl-click не перехвачен (defaultPrevented false).
- Начальный #audiences попал на offset 205 px; ArrowDown/Escape и настоящее hover/leave сработали.
- CDP touchStart/move/end прокрутил страницу более чем на100 px в native-mobile; landscape 932×430 сохранил нативный режим без overflow.

Независимый review исходников и реального CDP дополнительно проверил активный resize 1920→1440→3840→1366→1920, прерывание якоря колесом, последующий фокус, reduced toggle и мобильные меню/карточки. Визуальное ревью выявило потерю частей боковых слов при25% и нижней подписи на1366; исправлены пространственные цвета букв по обоим измерениям маски и раннее затемнение. После исправления проверены resize градиентов и полное восстановление исходных цветов/inline styles в mobile/reduced. Во время реализации также исправлены stale width после refresh, округление scale alias, поздняя смена цветов и CSS-перекрытия.

NEURO-LINT как формальный инструмент не объявляется выполненным: команда/методика в контексте не определена. Сохранность контента проверена сравнением исходников; новых вымышленных фактов нет.

## Roveia

[Live Roveia](https://www.roveia.com/) открыт в том же Chromium при 1920×1080. Сняты шесть состояний scroll 0/250/500/750/1000/1250; получены live ScrollTrigger и inline-код. reference.json (локальный артефакт: `output/playwright/reference.json`), начало (локальный артефакт: `output/playwright/roveia-0.png`), переход (локальный артефакт: `output/playwright/roveia-5.png`), исходник roveia-inline.js.

| Свойство | Roveia live | SyntheCore |
|---|---|---|
| Lenis | 1.3.11, duration 1.2, smoothWheel true | 1.3.26, duration 1.2, smoothWheel true, lerp 0 |
| Интеграция | GSAP ticker, ScrollTrigger.update, lagSmoothing 0 | Та же схема, один ticker |
| Hero pin | start top top, end innerHeight×1.1, scrub 1 | Те же параметры; end 1188 px при 1080 |
| Рост медиа | Анимация width/height/left/top, ease none | Маска + равномерный transform, ease none |
| Цвет/затемнение | Overlay и белый цвет текста по Timeline | Существующий градиент, цвет по покрытию; оранжевый акцент сохранён |
| Release | Hero освобождается; следующий блок входит | Hero освобождается; «С кем работаем» входит |

Сравнивались плавное догоняние, расширение и handoff. Это воспроизведение характера движения с сохранением SyntheCore, не пиксельное совпадение разных сайтов. Roveia завершает рост медиа раньше окончания своей цветовой Timeline; SyntheCore раскрывает фотографию на всей собственной Timeline.

## Запись

hero-down-up.webm (локальный артефакт: `output/playwright/hero-down-up.webm`) — реальная прокрутка колесом вниз через освобождение Hero и обратно, 11,95 секунды, VP8/WebM, 20 fps, 1280×624. video-check.json (локальный артефакт: `output/playwright/video-check.json`) подтверждает настоящее воспроизведение в Chromium, разные декодированные кадры на2/5/9 секунде, длительность и отсутствие media error. Кадры просмотрены: раскрытие, второй блок и обратное движение. В проверочном headless-браузере seek по paused video давал устаревшую compositor-картинку; проверка использует естественное воспроизведение и чтение пикселей decoded video, а не только loadedmetadata.

Источник — настоящие CDP Page.screencastFrame с timestamps; точный список и количество сохранены в recording.json. Запись ресэмплирована к 20 fps по времени. CDP записывает видимую compositor surface, которая в этой сессии ниже эмулированного CSS viewport; пропорции исходных кадров при кодировании сохранены. Видео показывает Hero и переход, не является замером FPS приложения.

Playwright recordVideo не смог запустить encoder из Node (spawn EPERM); вместо него получены CDP-кадры, обработанные прямым запуском установленного FFmpeg. Никаких рисованных или сгенерированных кадров нет.

## Ограничения и оставшиеся проблемы

Блокирующих ошибок Hero в выполненных проверках не обнаружено. Независимое визуальное ревью дополнительно проверило10/15/25% после исправления контраста; на10% заметна слабая тень исходной центральной рамки, которая полностью угасает к18% (сохранение оригинальной тени placeholder). Это небольшое визуальное замечание.

Touch/ориентация проверены эмуляцией Chromium; реальные телефоны и Safari/Firefox не тестировались. Формальный FPS, paint/long tasks и WCAG-контраст не измерены. CSS всё ещё содержит исторические переопределения; их общая чистка вне текущей задачи. Размеры карточек и остальные секции остаются следующими задачами.

## Воспроизведение

```powershell
node scripts/check-hero-geometry.cjs
node scripts/check-project.cjs
node scripts/check-browser-access.cjs
$env:PLAYWRIGHT_CDP_URL = 'http://127.0.0.1:9222'
node scripts/verify-hero.cjs
node scripts/check-adversarial.cjs
node scripts/capture-reference.cjs
node scripts/prepare-recording.cjs
& "$env:LOCALAPPDATA\ms-playwright\ffmpeg-1011\ffmpeg-win64.exe" -y -hide_banner -loglevel error -f image2pipe -framerate 20 -vcodec mjpeg -i ./output/playwright/hero-recording.mjpeg -an -c:v libvpx -pix_fmt yuv420p -b:v 1800k -deadline realtime -cpu-used 4 ./output/playwright/hero-down-up.webm
node scripts/capture-evidence.cjs
```

verify-hero выполняет матрицу и записывает CDP-кадры. Для записи отдельно: node scripts/record-hero.cjs. Если CDP не запущен, инструкция — [chromium-access.md](chromium-access.md). Недоступный браузер возвращает ошибку, без фиктивных passed.
