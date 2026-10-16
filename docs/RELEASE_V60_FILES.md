# Файлы интеграции v60

Полный фактический перечень каждого изменённого/добавленного файла, включая скриншоты и измерения QA; видеозаписи остаются только локально: [changed-files.txt](qa/v60/changed-files.txt). Удалённых файлов нет.

Ветка `release/site-v60` сравнена с `origin/main` (`dc54a7db5e82e71ee947262d6e926a3e6a7d68e6`) через `git diff --name-status origin/main`, а новые файлы — через `git ls-files --others --exclude-standard`. Ниже сгруппирован состав без промежуточного снимка staging. Полный точный список для PR воспроизводится после добавления файлов командой `git diff --name-status origin/main...HEAD`. Результаты приёмки — в [QA v60](QA_V60.md), baseline и ограничения — в [релизе](RELEASE_V60.md).

## Состав от v31

| Статус | Файлы/группа | Назначение |
|---|---|---|
| A | `.gitattributes` | Сохранение точных байтов SVG/vendor при checkout |
| M | `index.html`, `css/main.css`, `css/works.css`, `js/works.js` | Полный сайт v60, меню/CTA, одна Works timeline v45 |
| A | `css/services.css`, `js/services.js` | Services v46, desktop pin/native лента |
| A | `css/process.css`, `js/process.js` | Три шага и иллюстрация |
| A | `css/testimonials.css`, `js/testimonials.js` | Reviews v58 без возврата механики v57 |
| A | `css/faq-footer.css`, `js/faq-footer.js` | FAQ ×7 и светлый footer с волнами |
| A | `assets/process/` ×3, `assets/services/` ×12, `assets/testimonials/` ×4 | Иллюстрации, SVG услуг и демонстрационные портреты |
| M | `assets/vendor/LENIS-LICENSE.txt` | В Git сохранены исходные CRLF без изменения текста лицензии |
| M | `js/main.js`, `start-local.ps1` | Возврат фокуса меню; надпись launcher v60 |
| M | `scripts/check-project.cjs`, `scripts/verify-works-static.cjs`, `scripts/test-static-checks.cjs` | Проверки структуры/ресурсов v60 и статические fixtures |
| A | `scripts/verify-services-static.cjs`, `scripts/verify-works-handoff-v45.cjs` | Текущие статические guards Services и перехода Works |
| A | `scripts/verify-v60-browser.cjs`, `verify-v60-regressions.cjs`, `verify-v60-extended.cjs`, `verify-v60-motion.cjs`, `verify-v60-evidence.cjs` в `scripts/` | HTTP/browser-матрица, воспроизведение дефектов, дополнительные проверки, измерения и контроль сохранённого evidence |
| A | `scripts/verify-works-services-transition-v38.cjs`, `verify-works-services-transition-v39.cjs`, `verify-works-shadow-v40.cjs`, `verify-works-timeline-v43.cjs` в `scripts/` | Исторические сценарии поставки; статус описан в реестре проверок |
| M | `README.md`, `docs/SITE_ARCHITECTURE.md`, `SCROLL_MECHANICS.md`, `CHANGELOG.md`, `01_NEW_CHAT_START.md` в `docs/`, `scripts/HISTORICAL_CHECKS.md`, `docs/asset-manifest.json` | Актуальная документация, история, полный asset manifest |
| A | `docs/RELEASE_V60.md`, `RELEASE_V60_FILES.md`, `QA_V60.md` в `docs/`; план интеграции в `docs/superpowers/plans/` | Релиз, состав, фактическая приёмка и план; QA заполняется владельцем проверок |
| A | `docs/qa/v60/` | Отобранные воспроизводимые свидетельства приёмки; состав и ограничения — в README evidence и QA |
| A | `docs/SERVICES*`, `docs/WORKS*`, `docs/PROCESS*`, `docs/TESTIMONIALS*`, `docs/release-source-v60/` | Сохранённые исходные документы v32–v60; прежние PASS не перенесены в новую матрицу |

`A`/`M` обозначают добавление/изменение относительно baseline, независимо от того, в каком коммите или staging находится путь. Удалений рабочего кода и исторических материалов нет. Новые QA/evidence-документы добавляются по фактически завершённым проверкам; этот реестр не является заявлением об их результате.

## Точные исключения из полного источника

SHA256 текущих `index.html`, `css/`, `js/`, `assets/` сравнены с распакованным `SyntheCore_v60_Full_Site.zip`. Runtime совпадает побайтно, кроме четырёх содержательных исправлений:

| Файл | Изменение поверх поставки |
|---|---|
| `js/main.js` | Escape возвращает фокус кнопке меню, если активный элемент был внутри скрываемой панели |
| `js/services.js` | Keyboard focus (`:focus-visible`) обнуляет скрытый `viewport.scrollLeft` и переводит документ к карточке по диапазону существующего pin |
| `js/testimonials.js` | Keyboard focus в v58 stream обнуляет native `scene.scrollLeft` и `cards.scrollLeft`, переводит документ к карточке через тот же trigger; wheel/touch draw/travel не менялись |
| `js/faq-footer.js` | ResizeObserver FAQ с debounce 120ms вызывает `ScrollTrigger.refresh(true)`; существующий Hero refresh-listener пересчитывает Lenis |

HTML-тексты, восемь секций, изображения, CSS и wheel/touch-механика Reviews v58 совпадают с полным источником. Hero geometry/scroll, старые Works-изображения и иллюстрации аудитории не получили содержательных изменений относительно v31. Архивный README поставки перемещён и снабжён предупреждением об историческом статусе; относительные ссылки исправлены для нового расположения.

Вне runtime исправлены диагностические надписи launcher v23.1 → v60 и `check-project.cjs` v32 → v60. Добавлены документы/проверки и расширен asset manifest. `.gitattributes` устанавливает `assets/**/*.svg -text` и `assets/vendor/** -text`: после воспроизведённого Windows checkout-сбоя 3075 → 3091 байт Git больше не меняет эти файлы через `core.autocrlf`. `LENIS-LICENSE.txt` хранит оригинальные CRLF и совпадает по SHA256 с поставкой; семантика vendor не менялась. Рабочая копия и чистый экспорт после исправления проходят все 36 хешей asset/vendor manifests.

## Сохранённые материалы

- `.gitignore`, `start-local.bat`, `start-chromium.bat`, утилиты Chromium и `scripts/lib/` сохранены. `start-local.ps1` сохраняет сервер/параметры с указанной диагностической правкой.
- Локальные GSAP/ScrollTrigger 3.12.5 и Lenis 1.3.26 сохранены без повышения версий.
- Git-история и `backup/` не переписаны; baseline доступен по тегу `backup/v31-before-v60-2026-10-16`.
- Прежние `docs/QA_V31.md`, `docs/CSS_CASCADE_V31.md`, `docs/00_MASTER_CONTEXT.md`, отчёты и планы сохранены как история.
- Старые проверки не удалены и не ослаблены под новую страницу; их статус описан в [реестре](../scripts/HISTORICAL_CHECKS.md).
- Отсутствующие preview и evidence в старых заметках — локальные артефакты, а не гарантированные файлы клона. Профили, ZIP, screenshots и видео `output/` не включены в runtime.

Перед push проверены доступные настройки GitHub: Pages выключен, Actions/hooks отсутствуют, deployments пуст, check runs/status contexts — 0. Автоматический production-канал не наблюдался; deploy не вызывался. Merge и production требуют отдельного разрешения.
