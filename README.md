# SyntheCore — v31

Статическая главная страница SyntheCore. Актуальная база — интеграция Works v31, принятая и влитая через PR #1 (`038a062f95b52f833910aa99a12e2364b8460d97`, 15 октября 2026 г.).

Порядок секций: Hero → «С кем работаем» → шесть работ → будущие «Услуги» → контактный footer. Работы: B2B-кабинет, приложение заказа цветов, кастомная CRM, Beauty Insight AI, «Простор», расчёт стоимости металлоконструкций. Подписи концептов, прототипов и демонстрационных данных сохранены в HTML. «Услуги» пока служат заглушкой после Works; контактный footer содержит действующую ссылку `mailto:max.eroxin@gmail.com`.

## Локальный запуск

В PowerShell из папки проекта:

```powershell
.\start-local.ps1
```

Или запустите `start-local.bat`. Сервер открывает [локальную страницу](http://127.0.0.1:4173/), отдаёт файлы без кеширования и останавливается через Ctrl+C. Другой порт: `.\start-local.ps1 -Port 4174`. Если сервер уже работает, достаточно обновить страницу.

Для сайта не нужны установка пакетов, Node, Python или сборка: HTML, CSS, JavaScript, изображения и библиотеки находятся в репозитории. Node нужен только для проверок, Playwright и Chromium — для браузерной приёмки.

## Проверки

Из корня репозитория:

```powershell
node scripts/check-project.cjs
node scripts/verify-works-static.cjs
node scripts/check-hero-geometry.cjs
node scripts/test-static-checks.cjs
git ls-files --cached --others --exclude-standard | node scripts/check-doc-links.cjs
```

Это текущие проверки v31. Они проверяют структуру, ресурсы и геометрию без сервера. При работающем сервере `node scripts/check-project.cjs --http http://127.0.0.1:4173/` дополнительно сравнивает отданные ресурсы с файлами. Визуальное поведение проверяется отдельно по [QA v31](docs/QA_V31.md). Браузерный сценарий сохраняет сравнимые состояния:

```powershell
node scripts/verify-v31-browser.cjs --capture=before
node scripts/verify-v31-browser.cjs --capture=after
```

Для другого адреса задайте `$env:SYNTHECORE_URL = 'http://127.0.0.1:4174/'`. Подключение к отдельному Chromium описано в [инструкции доступа](docs/chromium-access.md). Команды выше не являются заявлением об успешном запуске; результаты и ограничения фиксируются в QA. Старые `verify-hero-gate*` и отчёты v23 относятся к прежним итерациям; их назначение — в [реестре исторических сценариев](scripts/HISTORICAL_CHECKS.md).

## Устройство сайта

`index.html` подключает `css/main.css`, локальный CSS Lenis и `css/works.css`; затем defer-скрипты GSAP/ScrollTrigger 3.12.5, Lenis 1.3.26 и четыре скрипта сайта. Единственный владелец Lenis — `js/hero-scroll.js`. Works использует CSS sticky и по одному GSAP tween на карточку; свою прокрутку не создаёт. Композиция Works и существующие анимационные алгоритмы сохраняются при рефакторинге.

- [Архитектура и файлы](docs/SITE_ARCHITECTURE.md)
- [Прокрутка, события и fallback](docs/SCROLL_MECHANICS.md)
- [CSS-каскад v31](docs/CSS_CASCADE_V31.md)
- [Проверки и ограничения v31](docs/QA_V31.md)
- [История изменений](docs/CHANGELOG.md)
- [Старт нового чата](docs/01_NEW_CHAT_START.md)
- [Архив мастер-контекста](docs/00_MASTER_CONTEXT.md)
- [Manifest изображений](docs/asset-manifest.json) и [библиотек](docs/vendor-manifest.json)

Репозиторий: [SigmeD/synthecore_site](https://github.com/SigmeD/synthecore_site). Контрольные версии в `backup/` сохранены как история. Профили браузеров, кеши, логи, записи и большинство файлов `output/` локальные и не входят в Git. Исторические пути к таким материалам записаны как код с пометкой «локальный артефакт»; они не гарантируют наличие файлов в клоне.
