# Сборка и проверки

Команды выполняются из корня проекта. Node.js и Git нужны для сборки; npm-пакеты для неё не нужны.

```powershell
node scripts/build-site.cjs
node scripts/verify-site.cjs --http http://127.0.0.1:4176/
node scripts/audit-project.cjs
```

Первая команда обновляет HTML и `css/generated/home.css`. Вторая проверяет сборку, исходные SHA, Git index, структуру и HTTP-ресурсы, все `test-*.cjs` и ссылки документации. Без `--http` выполняются проверки локальных файлов. После коммита добавьте `--git-ref HEAD`: иначе проверяется подготовленный индекс. Аудит ничего не удаляет; `--json` выводит полный инвентарь.

| Группа | Поддерживаемые инструменты |
|---|---|
| Сборка | `build-site.cjs` |
| Общий запуск проверок | `verify-site.cjs` |
| Инвентарь и зависимости | `audit-project.cjs` |
| Статические контракты | `check-project.cjs`, `check-hero-geometry.cjs`, `verify-works-static.cjs`, `verify-services-static.cjs`, `verify-sticky-handoff-v61.cjs`, `verify-v62-import.cjs`, `check-doc-links.cjs` |
| Тесты сборки и отрицательные проверки | Все `test-*.cjs`; общий runner находит их автоматически |
| Браузер | `verify-case-browser.cjs`, `verify-case-links-browser.cjs`, `verify-metal-browser.cjs`, `verify-flowers-browser.cjs`, `verify-prostor-browser.cjs`, `verify-b2b-browser.cjs`, `verify-project-copy-browser.cjs`, `verify-orange-buttons.cjs`, `verify-css-refactor-browser.cjs` |
| Ручная диагностика | `check-browser-access.cjs`, `start-chromium.ps1`, `check-handoff-videos.cjs` |
| Контролируемое обновление vendor | `vendor-dependencies.cjs`; запускать только по отдельному заданию, версии библиотек заморожены |
| Общие функции | `lib/`: разбор HTML, ресурсы, контент, шаблоны, точные исключения приёмки, CSS-сборка и браузерные помощники |

Браузерные проверки запускаются отдельно: нужны доступная локальная установка Playwright и соответствующие эталоны. Адреса, назначение и ограничения описаны в [QA](../docs/QA.md). Проверка CSS использует `SYNTHECORE_URL` и `REFACTOR_BASELINE_URL`, по умолчанию порты 4176 и 4193. Эталон — runtime-файлы коммита `612da61751bc45090fe2bedf0e6cfccca9b02902`, отданные отдельным сервером. Без эталона сравнительную проверку нельзя считать выполненной.

45 скриптов разовых этапов v4–v60 и папка `backup` удалены после проверки зависимостей. Их исходники доступны через `git show 612da61:путь/к/файлу`. Это исторические материалы; для действующего сайта используйте команды выше. [Аудит и границы рефакторинга](../docs/REFACTOR_AUDIT.md).
