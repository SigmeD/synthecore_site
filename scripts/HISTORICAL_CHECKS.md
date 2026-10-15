# Исторические проверки до v31

Сценарии ниже сохранены для воспроизведения прежних итераций и их локальных артефактов. Они могут содержать старые viewport, DOM-ожидания, пути `output/` и требования к отдельному CDP-браузеру. Их наличие не означает, что они проходят на текущей странице. Они не заменяют [QA v31](../docs/QA_V31.md).

## Текущие команды

```powershell
node scripts/check-project.cjs
node scripts/verify-works-static.cjs
node scripts/check-hero-geometry.cjs
node scripts/verify-v31-browser.cjs --capture=before
node scripts/verify-v31-browser.cjs --capture=after
```

Первые три проверки работают без HTTP-сервера. `check-project.cjs --http http://127.0.0.1:4173/` дополнительно сравнивает HTTP-ресурсы с диском. Браузерному сценарию нужны работающий сервер, доступные Playwright и браузер; адрес задаётся через `SYNTHECORE_URL`. Результаты относятся только к фактически выполненному запуску.

## Отменённые механики

| Скрипты | Почему не являются приёмкой v31 |
|---|---|
| `verify-hero-gate.cjs`, `verify-hero-gate-edge.cjs`, `capture-hero-gate-comparison.cjs`, `inspect-gate-input-videos.cjs` | Устаревший обязательный wheel-gate; в текущем Hero нет блокировки до отдельного жеста |
| `verify-parallax-checkpoint.cjs` | Устаревшее ожидание checkpoint перед следующим жестом |
| `verify-hero-two-phases.cjs`, `verify-hero-two-phases-lifecycle.cjs` | Отменённая отдельная фаза handoff/скрытия следующего блока |
| `verify-hero-handoff.cjs`, `capture-hero-handoff-reference.cjs`, `prepare-handoff-recording.cjs`, `record-hero-handoff.cjs`, `check-handoff-videos.cjs` | Предыдущий handoff и его записи/проверки |
| `verify-audience-deck.cjs`, `audit-audience-deck.cjs` | Отменённая колода аудиторий; сейчас используется hover/focus/tap-превью |
| `verify-hero-compact.cjs`, `audit-hero-compact.cjs`, `build-hero-compact-report.cjs` | Промежуточная геометрия растущего компактного баннера |

## Исторические узкие проверки и инструменты

| Скрипты | Назначение и границы |
|---|---|
| `verify-hero.cjs`, `check-adversarial.cjs` | Ранняя матрица Hero; без полной приёмки шести Works v31 |
| `verify-audience-preview.cjs`, `audit-audience-preview-reference.cjs` | Узкая проверка превью/сравнения аудиторий; без полной приёмки страницы |
| `verify-audiences.cjs`, `audit-audiences.cjs` | Прежняя проверка геометрии и оформления аудиторий |
| `verify-audience-parallax.cjs`, `verify-hero-v8-reference.cjs` | Проверки этапа восстановления Hero и параллакса; не полная матрица v31 |
| `capture-reference.cjs`, `inspect-reference.cjs`, `inspect-hero.cjs` | Исследование референса и диагностические снимки |
| `record-hero.cjs`, `prepare-recording.cjs`, `capture-evidence.cjs` | Старые записи, кодирование и проверка локальных evidence-файлов |
| `record-audience-parallax.cjs`, `encode-audience-parallax-video.cjs` | Запись/кодирование предыдущего перехода Hero → аудитории |

`check-browser-access.cjs` и `start-chromium.ps1` остаются инструментами доступа к отдельному Chromium, а не полной проверкой сайта. `vendor-dependencies.cjs` загружает фиксированные библиотеки и обновляет их manifest; для обычного запуска сайта его выполнять не нужно. Не изменяйте библиотеки для запуска исторических проверок.

Отчёты старых запусков сохранены в [архиве мастер-контекста](../docs/00_MASTER_CONTEXT.md) и датированных документах `docs/`. Указанные там локальные артефакты могут отсутствовать в Git-клоне; старые PASS не следует переносить на v31.
