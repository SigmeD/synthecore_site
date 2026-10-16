# Старт нового чата — SyntheCore v60

Сначала прочитайте [README](../README.md), [архитектуру](SITE_ARCHITECTURE.md), [механику прокрутки](SCROLL_MECHANICS.md), [релиз](RELEASE_V60.md) и [QA v60](QA_V60.md). Это вход в текущую интеграционную версию. [QA v31](QA_V31.md), [CSS-каскад v31](CSS_CASCADE_V31.md), [мастер-контекст](00_MASTER_CONTEXT.md), документы v32–v58 и исходные заметки в `docs/release-source-v60/` — история своих итераций. Их слова «актуально» и PASS не утверждают новую сборку.

Текущая main содержит v60: [PR #3](https://github.com/SigmeD/synthecore_site/pull/3) объединён 16 октября 2026 по прямому разрешению владельца, merge-коммит `19efcea`. Production не выполнялся. Ветка интеграции: `release/site-v60`. Baseline v31: `dc54a7db5e82e71ee947262d6e926a3e6a7d68e6`; тег отката: `backup/v31-before-v60-2026-10-16`. Ранее Works v31 был принят через PR #1 (`038a062f95b52f833910aa99a12e2364b8460d97`); это исторический merge, а не непосредственная база v60. Production требует отдельного разрешения владельца.

Полный runtime взят из `SyntheCore_v60_Full_Site.zip`, а не собран промежуточными патчами. Порядок: Hero → аудитории → Works ×6 → Services ×6 → Process ×3 → Reviews ×4 → FAQ ×7 → светлый контактный футер. Reviews сохраняет scroll-stream v58. Работы: b2b, flowers, crm, beauty, prostor, metal. Сохраняйте тексты, статусы концептов/прототипов, изображения, композицию, порядок, цвета и механику; меняйте код только для подтверждённых дефектов с повторной проверкой.

GSAP/ScrollTrigger 3.12.5 и Lenis 1.3.26 локальные. Lenis создаётся только в `js/hero-scroll.js` и получает время от одного GSAP ticker callback; wheel-gate отсутствует. Works — одна pinned timeline v45 (в том числе на малых ширинах без reduced motion); Services — desktop pin v46 с native горизонтальным fallback; Reviews v58 — CSS sticky без GSAP pin и свой кратковременный RAF для рисования. Process, FAQ и волны не создают дополнительную прокрутку.

Подтверждённые исправления интеграции: keyboard focus Services/Reviews использует существующие scroll-сцены и сбрасывает скрытые horizontal offsets; Escape возвращает фокус из закрываемого меню; ResizeObserver FAQ через 120ms debounce вызывает `ScrollTrigger.refresh(true)` и существующий пересчёт Lenis. Обычная wheel/touch-механика Reviews v58 сохранена. Исходные сбои и retest зафиксированы отдельно от полной матрицы; точный состав — в [реестре файлов](RELEASE_V60_FILES.md).

Сайт не требует установки пакетов. Для интеграционной рабочей копии используйте:

```powershell
.\start-local.ps1 -Port 4174
node scripts/check-project.cjs
node scripts/verify-works-static.cjs
node scripts/verify-services-static.cjs
node scripts/check-hero-geometry.cjs
node --test scripts/test-static-checks.cjs
node scripts/verify-works-handoff-v45.cjs
node scripts/verify-v60-regressions.cjs
node scripts/verify-v60-browser.cjs
node scripts/check-project.cjs --http http://127.0.0.1:4174/
git ls-files --cached --others --exclude-standard | node scripts/check-doc-links.cjs
```

После merge основная папка main на порту 4173 также содержит v60; интеграционная копия остаётся на 4174. В новом сеансе перепроверьте фактический сервер, путь и браузер; исторические сообщения об их доступности не дают гарантий. Старый `verify-v31-browser.cjs` не является матрицей v60. Назначение промежуточных тестов — в [реестре](../scripts/HISTORICAL_CHECKS.md).

Browser QA требуется для всех десяти размеров из [QA v60](QA_V60.md), включая 3840×2160, 2560×1440, 2048×1080, 1920×1080, 1440×900, 1366×768, 1024×768, 768×1024, 390×844, 320×568. Проверяйте восемь секций вниз/вверх, pin release, переходы, reload/resize/ориентацию, FAQ, якоря, CTA, keyboard/touch, reduced motion, ошибки/404/overflow и волны на остановленной странице. Статические проверки не заменяют browser QA; импортированные старые результаты не переносите в новую матрицу.

Отзывы/портреты демонстрационные и обозначены ДЕМО. Для production нужны подтверждённые материалы либо согласованное скрытие секции; FAQ и контакты требуют утверждения. Не выдумывайте клиентов, показатели, коммерческие условия или результаты QA. Перед push проверены доступные настройки: GitHub Pages выключен, Actions/hooks отсутствуют, deployments пуст, check runs/status contexts — 0. Автоматический production-канал не наблюдался, deploy не вызывался; отдельное разрешение на merge/production остаётся обязательным.

Сохраняйте `.gitattributes`: SVG в `assets/` и файлы `assets/vendor/` имеют `-text`, чтобы checkout на Windows не менял байты manifest. CRLF лицензии Lenis соответствует поставке; тексты/версии vendor не изменялись. Чистый экспорт проверен по всем 36 хешам.

Исторические preview и `output/`-пути — локальные артефакты, обычно отсутствующие в Git. Не создавайте фиктивных ссылок и не выдавайте наличие скрипта/снимка за выполненную приёмку. Сохраняйте `backup/`, историю Git и manifest-файлы; актуальные ограничения берите из релиза и QA, а не из накопленного README поставки.
