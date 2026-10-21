# Текущие и исторические проверки

Текущий main после [PR #6](https://github.com/SigmeD/synthecore_site/pull/6), merge `3256e53`, содержит v62 с оболочкой и каталогом v27. Действующая приёмка и prerequisites браузерных сценариев — [QA v62](../docs/qa/v62-on-v27/README.md). Старые PASS, viewport, DOM-ожидания и локальные файлы `output/` не заменяют новую проверку.

## Текущие проверки v62 + v27

```powershell
node scripts/verify-v62-import.cjs
node docs/qa/v62-on-v27/verify-git.cjs HEAD
node scripts/build-site.cjs --check
node scripts/check-project.cjs
node scripts/verify-works-static.cjs
node scripts/verify-services-static.cjs
node scripts/check-hero-geometry.cjs
node scripts/verify-sticky-handoff-v61.cjs
node --test scripts/test-static-checks.cjs scripts/test-shared-site.cjs
git ls-files --cached --others --exclude-standard | node scripts/check-doc-links.cjs
```

Статические тесты — 75, проверка источников — 17 raw motion / 25 v27 / семь секций. `verify-git.cjs HEAD` проверяет коммит, без аргумента — индекс; изменения на диске отдельно проверяет `verify-v62-import.cjs`. Полный архивный `--strict` не является контрактом принятой композиции: 423/437 — исторический снимок.

Браузерные сценарии принятой композиции находятся в `docs/qa/v62-on-v27/`: `catalog.cjs` принимает `SYNTHECORE_URL`, `motion.cjs` и `shell.cjs` используют фиксированные 4180/4181/4182 и требуют эталонов. Результаты новых прогонов пишутся в `output/v62-on-v27/`. Команды запуска и ограничения приведены в [QA](../docs/qa/v62-on-v27/README.md). Основной launcher по умолчанию — 4173; последний локальный просмотр — 4176.

**Все разделы ниже исторические.** Они описывают прежнюю приёмку v27/v60 и старые ожидания pin/menu/Lenis, поэтому их нельзя запускать как обязательный acceptance suite текущей главной. [QA v27](../docs/qa/works-v27/README.md), [QA v60](../docs/QA_V60.md) сохраняются как доказательства прежних состояний. Старые browser scripts могут перезаписывать эти доказательства — используйте их только для явно поставленной исторической диагностики.

## История: общая оболочка и каталог v27

```powershell
node scripts/build-site.cjs --check
node --test scripts/test-static-checks.cjs scripts/test-shared-site.cjs
$env:SYNTHECORE_URL = 'http://127.0.0.1:4183/'
node scripts/verify-works-v27-browser.cjs
node scripts/verify-works-v27-motion.cjs
```

| Команда | Область и артефакты |
|---|---|
| `build-site.cjs` / `--check` | Генерация HTML из partials/шаблонов либо проверка, что готовые `/` и `/raboty/` соответствуют источникам |
| `test-shared-site.cjs` | Общие шаблоны, правильные маршруты/якоря, 6 исходных кейсов/PNG, один footer/menu owner, локальные font hashes; вместе с исходными static fixtures — 74 теста |
| `verify-works-v27-browser.cjs` | Обе страницы, 320/390/768/990/1440/1920/2560; размеры/типографика, menu, dialog/focus/scroll-lock, hover, единственный scroll owner, footer, reduced motion, маршруты/refresh; PNG и `browser-report.json` в `docs/qa/works-v27/` |
| `verify-works-v27-motion.cjs` | Начальное/промежуточное/конечное состояние CTA, повторное подключение, mobile copyright; PNG и `motion-report.json` в QA; видео локально в `output/playwright/works-v27/motion/` |

Браузерные команды требуют HTTP-сервер, Playwright и Chromium. Без переменной URL новые v27-сценарии используют 4182, прежние v60 — 4174, поэтому адрес проверяемой копии задавайте явно. В текущем сеансе v27 работает на 4183; launcher по умолчанию использует 4173. `verify-works-v27-motion.cjs --diagnose` — локальная диагностика сравнения архива/интеграции на фиксированных 4181/4182, не переносимая приёмочная команда.

Приёмка 20 октября: static 74/74, общий browser 295/295, motion 6/6. Это сохранённые результаты, не автоматическое подтверждение последующих правок. При новом запуске браузерные сценарии перезаписывают evidence; проверяйте изменения до коммита.

## История: проверки главной v60 в интеграционной ветке

```powershell
node scripts/check-project.cjs
node scripts/verify-works-static.cjs
node scripts/verify-services-static.cjs
node scripts/check-hero-geometry.cjs
node --test scripts/test-static-checks.cjs scripts/test-shared-site.cjs
node scripts/verify-works-handoff-v45.cjs
$env:SYNTHECORE_URL = 'http://127.0.0.1:4173/'
node scripts/verify-v60-regressions.cjs
node scripts/verify-v60-browser.cjs
git ls-files --cached --others --exclude-standard | node scripts/check-doc-links.cjs
node scripts/check-project.cjs --http http://127.0.0.1:4173/
```

`verify-v60-regressions.cjs` и `verify-v60-browser.cjs` требуют работающий HTTP-сервер, Playwright и Chromium. Переменная `SYNTHECORE_URL` задаёт их адрес. Команда с `--http` сравнивает отданные ресурсы с диском. Статические команды работают без сервера. Статические проверки не доказывают качество переходов и реальную прокрутку. Узкий `verify-works-handoff-v45.cjs` фактически запущен при обновлении документации 16 октября 2026 и прошёл на импортированном runtime: один Works pin, въезд от `innerHeight`, отсутствие LAST_HOLD и отрицательного margin перед Services. Он применим как текущий static guard, но не заменяет браузерную приёмку перехода.

Новый regression-сценарий проверяет фокус Services/Reviews, переключение native/pinned ленты, Escape меню и refresh FAQ; `--phase=...` задаёт имя локального JSON в `output/playwright/v60/regressions/`. Полный browser-сценарий проверяет десять размеров; принимает `--only=1440x900`, `--engine=chromium` и `--phase=...`, сохраняет evidence под `output/playwright/v60/`. Это локальные артефакты вне Git; итоговые результаты и ограничения приведены в QA.

В этой ветке `verify-v60-browser.cjs` учитывает переход Header Works на каталог и JS-path Footer v12; прежние SMIL-ожидания заменены проверками реального нового компонента. Сцены главной и сценарии их регрессий сохранены. Полный прогон новой интеграции выполнен на четырёх размерах: 1440×900 — 68/68, 390×844 — 64/64, 1920×1080 — 68/68, 2560×1440 — 68/68; регрессии до/после — 5/5 + 5/5. Исторические 666/666 на десяти размерах относятся к QA исходной v60.

`check-project.cjs` проверяет 40 asset/vendor/font hashes; `--http` дополнительно сравнивает 53 ресурса главной с диском. Этот HTTP-режим не заменяет browser/shared-site проверки каталога. Сам список команд не означает, что они запущены после последних правок.

## Сохранённые проверки v31 и переходов v38–v43

| Скрипты | Почему исторические |
|---|---|
| `verify-v31-browser.cjs` (`--capture=before`, `--capture=after`) | Матрица и ожидания структуры v31; результаты относятся к [QA v31](../docs/QA_V31.md), а не к восьми секциям v60 |
| `verify-works-services-transition-v38.cjs`, `verify-works-services-transition-v39.cjs` | Промежуточные переходы до единой Works timeline v45 |
| `verify-works-shadow-v40.cjs` | Ожидания теней/композиции конкретной v40, не текущий полный контракт |
| `verify-works-timeline-v43.cjs` | Промежуточная timeline до v45; не подгонять старые assertions под новую реализацию |

## Отменённые механики до v31

| Скрипты | Почему не являются приёмкой v60 |
|---|---|
| `verify-hero-gate.cjs`, `verify-hero-gate-edge.cjs`, `capture-hero-gate-comparison.cjs`, `inspect-gate-input-videos.cjs` | Обязательный wheel-gate отменён; Hero не блокирует скролл до отдельного жеста |
| `verify-parallax-checkpoint.cjs` | Ожидание checkpoint перед следующим жестом отменено |
| `verify-hero-two-phases.cjs`, `verify-hero-two-phases-lifecycle.cjs` | Отдельная фаза handoff/скрытия следующего блока отменена |
| `verify-hero-handoff.cjs`, `capture-hero-handoff-reference.cjs`, `prepare-handoff-recording.cjs`, `record-hero-handoff.cjs`, `check-handoff-videos.cjs` | Предыдущая механика handoff и её записи |
| `verify-audience-deck.cjs`, `audit-audience-deck.cjs` | Колода аудиторий заменена hover/focus/tap-превью |
| `verify-hero-compact.cjs`, `audit-hero-compact.cjs`, `build-hero-compact-report.cjs` | Промежуточная геометрия растущего баннера |

## Исторические узкие проверки и инструменты

| Скрипты | Назначение и границы |
|---|---|
| `verify-hero.cjs`, `check-adversarial.cjs` | Ранняя матрица Hero, без полного сайта v60 |
| `verify-audience-preview.cjs`, `audit-audience-preview-reference.cjs` | Узкая проверка превью/сравнения аудиторий |
| `verify-audiences.cjs`, `audit-audiences.cjs` | Прежняя геометрия и оформление аудиторий |
| `verify-audience-parallax.cjs`, `verify-hero-v8-reference.cjs` | Этап восстановления Hero и параллакса |
| `capture-reference.cjs`, `inspect-reference.cjs`, `inspect-hero.cjs` | Исследование референса и диагностические снимки |
| `record-hero.cjs`, `prepare-recording.cjs`, `capture-evidence.cjs` | Старые записи, кодирование и локальные evidence-файлы |
| `record-audience-parallax.cjs`, `encode-audience-parallax-video.cjs` | Запись/кодирование предыдущего перехода Hero → аудитории |

`check-browser-access.cjs` и `start-chromium.ps1` остаются инструментами доступа к отдельному Chromium, а не полной проверкой сайта. Адрес браузерных утилит может задаваться `SYNTHECORE_URL`; конфигурацию конкретного старого сценария проверяйте в его исходнике. `vendor-dependencies.cjs` загружает фиксированные библиотеки и обновляет manifest; обычному запуску сайта это не нужно. Не меняйте библиотеки ради старых тестов.

Отчёты прежних запусков сохранены в [мастер-контексте](../docs/00_MASTER_CONTEXT.md), [QA v31](../docs/QA_V31.md), документах v32–v58 и [исходных заметках v60](../docs/release-source-v60/V60_CHANGELOG_QA.md). Локальные preview, видео и screenshots могут отсутствовать в клоне. Их пути следует обозначать как локальные артефакты, а старые результаты не переименовывать в QA новой версии.
