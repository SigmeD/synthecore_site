# Текущие и исторические проверки

Этот реестр отделяет команды интеграции v60 от сохранённых сценариев прежних итераций. Старые PASS, viewport, DOM-ожидания и файлы `output/` не заменяют [QA v60](../docs/QA_V60.md). Исторические файлы сохраняются для воспроизведения своей версии, без ослабления их ожиданий под новую страницу.

## Текущие команды v60

```powershell
node scripts/check-project.cjs
node scripts/verify-works-static.cjs
node scripts/verify-services-static.cjs
node scripts/check-hero-geometry.cjs
node --test scripts/test-static-checks.cjs
node scripts/verify-works-handoff-v45.cjs
$env:SYNTHECORE_URL = 'http://127.0.0.1:4173/'
node scripts/verify-v60-regressions.cjs
node scripts/verify-v60-browser.cjs
git ls-files --cached --others --exclude-standard | node scripts/check-doc-links.cjs
node scripts/check-project.cjs --http http://127.0.0.1:4173/
```

`verify-v60-regressions.cjs` и `verify-v60-browser.cjs` требуют работающий HTTP-сервер, Playwright и Chromium. Переменная `SYNTHECORE_URL` задаёт их адрес. Команда с `--http` сравнивает отданные ресурсы с диском. Статические команды работают без сервера. Статические проверки не доказывают качество переходов и реальную прокрутку. Узкий `verify-works-handoff-v45.cjs` фактически запущен при обновлении документации 16 октября 2026 и прошёл на импортированном runtime: один Works pin, въезд от `innerHeight`, отсутствие LAST_HOLD и отрицательного margin перед Services. Он применим как текущий static guard, но не заменяет браузерную приёмку перехода.

Новый regression-сценарий проверяет фокус Services/Reviews, переключение native/pinned ленты, Escape меню и refresh FAQ; `--phase=...` задаёт имя локального JSON в `output/playwright/v60/regressions/`. Полный browser-сценарий проверяет десять размеров; принимает `--only=1440x900`, `--engine=chromium` и `--phase=...`, сохраняет evidence под `output/playwright/v60/`. Это локальные артефакты вне Git; итоговые результаты и ограничения приведены в QA.

Текущие результаты остальных команд и browser-матрицы ведутся в QA. Сам список команд не является заявлением об их успешном запуске. Основная копия `main` запускается на 4173; для параллельной копии можно выбрать 4174. Браузерные сценарии без `SYNTHECORE_URL` обращаются к 4174; явно указывайте адрес проверяемого сервера.

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
