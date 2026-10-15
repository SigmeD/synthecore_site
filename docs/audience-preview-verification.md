# «С кем работаем»: одна карточка по hover/focus/tap

14 октября 2026. Исправленное задание заменяет прежнюю колоду. Текущая версия — http://127.0.0.1:4173/.

## Итоговое поведение

- После загрузки и при входе блока в экран ни одна категория не выбрана, превью скрыто.
- Движение мыши/пера над категорией выделяет её и показывает одну соответствующую статью на общей поверхности справа. Переход к другой категории плавно проявляет её содержимое, без задних карточек или обмена слоями.
- Уход указателя из общего audience-container скрывает hover-превью. Перемещение из списка в карточку сохраняет его.
- Фактическая прокрутка сбрасывает hover-выбор. Прохождение списка под неподвижным курсором не активирует категории: pointerenter не используется, pointermove проверяется по изменению clientX/clientY. Для повторного открытия требуется движение указателя.
- Фокус на категории показывает её карточку. ArrowUp/Down и Home/End меняют фокус/категорию; Enter/Space активируют. Escape сбрасывает выбор и фокус. Tab за пределы списка закрывает keyboard-превью.
- На устройствах без hover tap открывает карточку; повторный tap на той же категории закрывает её. Tap по другой категории переключает содержимое, tap вне блока закрывает. Закрытое mobile-превью не занимает места.
- Выбранную нажатием или фокусом карточку можно прокручивать для чтения. Прокрутка не создаёт выбор и не меняет категорию; сброс при scroll относится к hover, а не к намеренному tap/focus.

## Оформление и сохранность

Фон и тень теперь принадлежат только audience-card-shell. Статьи имеют прозрачный фон и не рисуют собственных контуров; видима только выбранная. Удалены depth, смещения, is-front, deck timeline и audience ScrollTrigger. Карточка не поворачивается и не меняется местами с другими поверхностями.

Тёмный градиент сохраняет синий оттенок сверху и почти чёрный низ. Иллюстрации слева сверху, под ними мягкий локальный оранжевый radial gradient. Изображения не обрезаны, object-fit contain. Заголовок секции 32 px, отступ 36 px; крупные названия weight 300, основной текст 16/24 px, теги без рамок в одну строку. Тексты, порядок, иллюстрации и отсутствие «Смотреть» сохранены.

Высота общей grid-ячейки вычисляется по содержимому вариантов, без фиксированной высоты или min-height; сами статьи не растягиваются. На 1920×1080 одна поверхность имеет размер около 440×443 px. Проявление выбранного текста занимает 0,28 s с небольшим translateY 6 px; другие статьи сразу скрыты. При prefers-reduced-motion анимация и переходы отключены. Preview работает при отключённых GSAP, ScrollTrigger и Lenis.

Общий Hero/Lenis-контроллер не редактировался. В audience-логике больше нет создания GSAP timeline, ScrollTrigger, Lenis, ticker или wheel-обработчика. Добавлен пассивный scroll-observer, который только снимает hover-выбор и не управляет прокруткой.

## Скриншоты всех состояний при одинаковом окне

| Окно | Без выбора | Бизнес | Агентства | Студии |
|---|---|---|---|---|
|1920×1080|[Пустое превью](../output/playwright/audience-preview/1920x1080-closed.png)|[01](../output/playwright/audience-preview/1920x1080-card-0.png)|[02](../output/playwright/audience-preview/1920x1080-card-1.png)|[03](../output/playwright/audience-preview/1920x1080-card-2.png)|
|1366×768|[Пустое превью](../output/playwright/audience-preview/1366x768-closed.png)|[01](../output/playwright/audience-preview/1366x768-card-0.png)|[02](../output/playwright/audience-preview/1366x768-card-1.png)|[03](../output/playwright/audience-preview/1366x768-card-2.png)|
|390×844|[Закрыто](../output/playwright/audience-preview/390x844-closed.png)|[01](../output/playwright/audience-preview/390x844-card-0.png)|[02](../output/playwright/audience-preview/390x844-card-1.png)|[03](../output/playwright/audience-preview/390x844-card-2.png)|

Дополнительные кадры всей секции на mobile при том же viewport390×844: [закрыто](../output/playwright/audience-preview/390x844-closed-section.png), [01](../output/playwright/audience-preview/390x844-card-0-section.png), [02](../output/playwright/audience-preview/390x844-card-1-section.png), [03](../output/playwright/audience-preview/390x844-card-2-section.png). На этих дополнительных длинных кадрах скрыт только плавающий header, чтобы он не перекрывал заголовок секции. Обычные viewport-кадры сняты без изменения стилей.

Live [Roveia](https://www.roveia.com/) открыт при том же 1920×1080: [без выбора](../output/playwright/audience-preview/roveia-1920x1080-closed.png), [01](../output/playwright/audience-preview/roveia-1920x1080-card-0.png), [02](../output/playwright/audience-preview/roveia-1920x1080-card-1.png), [03](../output/playwright/audience-preview/roveia-1920x1080-card-2.png), [уход курсора](../output/playwright/audience-preview/roveia-1920x1080-leave.png). Кадры визуально подтверждают пустое начальное превью и одну карточку при hover. В первой попытке стартовая прокрутка live-сайта вернулась к hero; capture исправлен и повторён с проверкой положения заголовка. Итоговые файлы относятся к корректно выровненному блоку. DOM-параметры — [reference.json](../output/playwright/audience-preview/reference.json).

## Проверки

[acceptance.json](../output/playwright/audience-preview/acceptance.json): **11/11 passed**, без pageerror. Окна: 1366×768, 1920×1080, 3840×2160, 390×844, 320×740, 430×932, 850×900, 851×900; дополнительно reduced motion1920/390 и отключённые библиотеки1920.

Во всех конфигурациях проверены начальное состояние, все категории, число видимых статей, aria-pressed/aria-hidden/inert, отсутствие horizontal overflow, целая иллюстрация, компактная высота, читаемый текст и теги в одну строку. Desktop: переход в preview и уход из контейнера, настоящее wheel-движение вниз и обратно под неподвижным курсором, восстановление только после pointermove. Mobile: tap по всем категориям, повторный tap, сохранение намеренного выбора при чтении со скроллом. Клавиатура и reduced motion проверены на всех размерах.

До изменений новая проверка воспроизвела 11 нарушений пустого начального состояния: [baseline-failures.json](../output/playwright/audience-preview/baseline-failures.json). При доработке touch исправлен конфликт compatibility mousedown/focus перед click. В тесте keyboard-path дополнительно снимается уже существующий touch-фокус: повторный вызов focus() для уже сфокусированной кнопки не порождает нового события.

[additional.json](../output/playwright/audience-preview/additional.json): Tab за пределы списка закрывает preview; быстрые переключения оставляют одну видимую статью; resize1920→390→1920 сохраняет отсутствие overflow и закрытое состояние; настоящий CDP touch swipe прокручивает страницу и сохраняет намеренно открытую tap-карточку.

`node scripts/check-project.cjs`: HTML совпадает с baseline; header/menu и js/hero-scroll.js сохранены. CSS до последнего scoped audience-блока совпадает с baseline. Проверены 11 хешей ассетов/библиотек и 12 HTTP-ресурсов, совпадающих с диском. `node scripts/check-hero-geometry.cjs`: 12 сочетаний viewport/image и 60 crop-состояний passed. Синтаксис js/main.js и новых скриптов проверен `node --check`.

Проверки выполнены в Chromium, mobile — эмуляция размера и touch. Реальные телефоны и другие браузерные движки не проверялись. Полная прежняя матрица Hero не перезапускалась; контроллер сохранён побайтово, текущие browser cases используют его.

## Изменённые и добавленные файлы

Продукт:

- css/main.css — изменён только последний scoped блок #audiences: одна поверхность, скрытые варианты, CSS-проявление и reduced motion.
- js/main.js — изменена только IIFE аудиторий: hover/focus/tap, сброс и защита от активации скроллом; колода и audience ScrollTrigger удалены.

Проверки и документация:

- scripts/verify-audience-preview.cjs — новая acceptance и capture closed/0/1/2.
- scripts/audit-audience-preview-reference.cjs — live-reference capture.
- scripts/check-project.cjs — новая контрольная копия для проверки области изменений.
- docs/audience-preview-verification.md — текущий протокол.
- docs/superpowers/specs/2026-10-14-audience-preview-design.md — исправленная спецификация.
- docs/superpowers/plans/2026-10-14-audience-preview.md — исполненный план.
- README.md — актуализировано только описание/ссылки на audience-превью.

Артефакты — output/playwright/audience-preview/. Backup — backup/audience-preview-before-2026-10-14/. index.html, Hero-контроллер и библиотеки не менялись. Старые deck-скрипты/отчёты/скриншоты сохранены как история предыдущего, теперь отменённого требования.

Воспроизведение:

```powershell
node scripts/verify-audience-preview.cjs --capture
node scripts/audit-audience-preview-reference.cjs
node scripts/check-project.cjs
node scripts/check-hero-geometry.cjs
```
