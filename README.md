# SyntheCore — v60

[Draft PR #3: v31 → v60](https://github.com/SigmeD/synthecore_site/pull/3). `main` и production не изменены; QA-видео остаются локально.

Полная интеграционная версия статической главной страницы, подготовленная в `release/site-v60` из `SyntheCore_v60_Full_Site.zip`. База `main` до переноса: `dc54a7db5e82e71ee947262d6e926a3e6a7d68e6`. Локальная приёмка завершена: [результаты и ограничения](docs/QA_V60.md). Merge и публикация требуют разрешения владельца.

Восемь секций: Hero → «С кем работаем» → «Наши работы» (6 проектов) → «Что мы делаем» (6 услуг) → «3 шага до запуска» → «Что говорят клиенты» (4 демонстрационные карточки, механика v58) → FAQ (7 вопросов) → светлый контактный футер с тремя SVG-волнами. Основные пункты меню: «Работы → Услуги → Контакты»; футер также содержит «Вопросы».

Работы идут в порядке b2b, flowers, crm, beauty, prostor, metal. Статусы концептов, прототипов и демонстрационных данных сохранены. Отзывы и портреты явно помечены как ДЕМО; перед production нужны подтверждённые материалы либо согласованное скрытие. Тексты FAQ и контакты, включая `max.eroxin@gmail.com`, требуют подтверждения владельца. Демомаркировка сама по себе не снимает блокеры публикации.

## Локальный запуск

Из корня этой рабочей копии в PowerShell:

```powershell
.\start-local.ps1 -Port 4174
```

Адрес интеграционной копии: [127.0.0.1:4174](http://127.0.0.1:4174/). Исходная рабочая копия v31 использует порт 4173. Скрипт по умолчанию и `start-local.bat` выбирают 4173; для параллельной проверки v60 задавайте 4174 явно. Сервер отдаёт файлы без кеширования и останавливается Ctrl+C; надпись launcher обновлена до v60.

Сборка и установка пакетов для сайта не нужны: HTML, CSS, JS, изображения, GSAP/ScrollTrigger 3.12.5 и Lenis 1.3.26 находятся локально. Node нужен для проверок; браузерные сценарии дополнительно требуют Playwright и Chromium.

`.gitattributes` сохраняет точные байты SVG в `assets/` и всех файлов `assets/vendor/` через `-text`, чтобы Windows `core.autocrlf` не менял размеры/хеши manifest. Чистый экспорт Git после исправления проходит все 36 проверок хешей; `LENIS-LICENSE.txt` хранит исходные CRLF без изменения текста лицензии.

## Проверки

Из корня рабочей копии:

```powershell
node scripts/check-project.cjs
node scripts/verify-works-static.cjs
node scripts/verify-services-static.cjs
node scripts/check-hero-geometry.cjs
node --test scripts/test-static-checks.cjs
node scripts/verify-works-handoff-v45.cjs
node scripts/verify-v60-regressions.cjs
node scripts/verify-v60-browser.cjs
node scripts/verify-v60-extended.cjs
node scripts/verify-v60-motion.cjs --isolated
git ls-files --cached --others --exclude-standard | node scripts/check-doc-links.cjs
node scripts/check-project.cjs --http http://127.0.0.1:4174/
```

Последняя команда требует работающий сервер и сравнивает HTTP-ресурсы с диском. `verify-v60-regressions.cjs` проверяет реальные browser-сценарии фокуса Services/Reviews, меню, FAQ и переключения ленты; `verify-v60-browser.cjs` выполняет матрицу десяти viewport. Им нужны сервер, Playwright и Chromium. Это команды проверки, а не заявление об их результате. Фактическая матрица, browser evidence, результаты и ограничения ведутся в [QA v60](docs/QA_V60.md). Нужны полная прокрутка вниз/вверх, соседние переходы, resize, ориентация, FAQ, якоря, клавиатура/touch и reduced motion. Статические PASS не подтверждают визуальную приёмку.

`verify-v31-browser.cjs` и результаты [QA v31](docs/QA_V31.md) сохранены как история. Промежуточные сценарии v38–v43 также исторические. Границы каждого инструмента — в [реестре проверок](scripts/HISTORICAL_CHECKS.md). Инструкция отдельного Chromium сохранена в [chromium-access](docs/chromium-access.md); доступ проверяйте заново.

## Устройство и передача контекста

Единственный владелец Lenis — `js/hero-scroll.js`: один экземпляр получает время от GSAP ticker. Works v45 использует одну pinned timeline; Services v46 — desktop pin и горизонтальную ленту; Reviews сохраняет CSS sticky и scroll-stream v58 без GSAP pin. Process, FAQ и SVG-волны работают независимо. Точные пороги, очистка и refresh описаны по исполняемому коду:

- [Архитектура](docs/SITE_ARCHITECTURE.md) и [механика прокрутки](docs/SCROLL_MECHANICS.md)
- [Релиз v60, ограничения и откат](docs/RELEASE_V60.md)
- [Файлы переноса и сохранённые материалы](docs/RELEASE_V60_FILES.md)
- [История изменений](docs/CHANGELOG.md) и [старт нового чата](docs/01_NEW_CHAT_START.md)
- [Manifest ассетов](docs/asset-manifest.json) и [библиотек](docs/vendor-manifest.json)
- [Исходные заметки v60](docs/release-source-v60/V60_CHANGELOG_QA.md), [v59](docs/release-source-v60/INTEGRATION_NOTES.md), [v58 Reviews](docs/TESTIMONIALS_V58_QA.md)

Архивный [README поставки](docs/release-source-v60/README.md), [мастер-контекст](docs/00_MASTER_CONTEXT.md), [CSS-каскад v31](docs/CSS_CASCADE_V31.md), `backup/` и прежние QA сохраняют историю своих итераций. Их формулировки «актуально» и PASS не являются приёмкой v60. Пути к отсутствующим preview, скриншотам и `output/` обозначают локальные артефакты, а не гарантированные файлы клона.

Репозиторий: [SigmeD/synthecore_site](https://github.com/SigmeD/synthecore_site). Перед push проверены доступные настройки: Pages выключен, Actions и repository hooks отсутствуют, список deployments пуст, check runs и status contexts — 0. Автоматический production-канал не наблюдался; deploy не вызывался. Публикация требует согласования контента, preview и отдельного разрешения на merge/production.
