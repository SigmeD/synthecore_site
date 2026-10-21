# Архитектура: главная v62, оболочка и каталог v27

Согласованная runtime-база находится в main после merge `3256e53` от 21.10.2026. [Результат слияния](RELEASE_V62.md), [источники](V62_ON_V27_SOURCES.json), [ограничения](../AGENTS.md). Здесь описан текущий состав, а не прежняя главная v60.

## Маршруты и сборка

| Маршрут | Шаблон | Готовый файл |
|---|---|---|
| `/` | `templates/pages/home.html` | `index.html` |
| `/raboty/` | `templates/pages/works.html` | `raboty/index.html` |

Обе страницы статические, серверное приложение/менеджер пакетов для просмотра не нужны. `scripts/build-site.cjs` подставляет единственные `templates/partials/header.html` и `footer.html`, контекстные ссылки и `aria-current`; готовые HTML хранятся в Git. `--check` проверяет их актуальность без записи. Изменение шаблона разрешается только конкретным заданием; после него нужен build и соответствующие HTML в том же коммите.

Главная содержит семь содержательных секций v62 — `#top`, `#audiences`, `#works`, `#services`, `#process`, `#testimonials`, `#faq` — и общий `#contact` из v27. Каталог содержит intro, шесть карточек с modal-описаниями и тот же футер. Хедер находится вне main.

## CSS главной и каскад

Порядок подключений задаёт `templates/pages/home.html`:

1. Исходные `main.css`, локальный Lenis CSS, `works.css`, `services.css`, `process.css`, `testimonials.css`, `faq-footer.css`.
2. Надстройки v62: `design-system-v61.css`, `sticky-handoff-v61.css`, `v62-services-alignment.css`, `v62-typography-content-candidate.css`, `v62-hero-copy.css`.
3. Оболочка v27: `fonts.css`, `design-tokens.css`, `site-footer.css`, `shared-header-cta.css`.
4. `v62-v27-shell-preservation.css`: только ID-scoped восстановление согласованных стилей хедера/футера после глобальных v62-правил.

`sticky-handoff-v61.css` содержит действующие CSS sticky трёх сцен. Суффикс v61 и исторические слова candidate в исходниках не делают их устаревшими: файлы включены в утверждённую v62 и заморожены. Восстанавливать старый CSS поверх них нельзя.

Каталог использует исходные `raboty-base/cards/reveal/scroll/surface/type.css` и оболочку v27; надстройки главной v62 в каталог не подключены. Общий CTA CSS влияет на обе страницы, поэтому нельзя считать его изменение локальной задачей главной.

## JS и владельцы поведения

| Модуль | Ответственность |
|---|---|
| `hero-geometry.js` | Чистая crop-геометрия для браузера и Node-проверок |
| `hero-scroll.js` | Единственный Lenis главной, ticker GSAP, общий refresh, Hero и audience parallax |
| `main.js` | Меню главной и выбор аудиторий; защищён целиком |
| `works.js` | Вход первой работы и единая timeline следующих карточек, CSS sticky |
| `services.js` | Вертикальный прогресс горизонтали, native fallback, клавиатура/resize |
| `process.js` | Состояние трёх шагов и исходные эффекты иллюстрации |
| `testimonials.js` | Поток четырёх ДЕМО-карточек, локальное сглаживание, native fallback |
| `faq-footer.js` | FAQ/refresh и сохранённая legacy-ветка старых волн, у которой нет активных узлов |
| `site-header.js` | Меню каталога, на главной не подключается |
| `footer-waves.js`, `footer-reveal.js` | Единственные активные движки футера v27 на обеих страницах |
| `raboty-scroll.js` | Единственный Lenis отдельного документа каталога и reveal карточек |
| `raboty-cards.js`, `raboty-effects.js`, `raboty-motion.js` | Исходные взаимодействия каталога v27 |

GSAP/ScrollTrigger и Lenis загружаются до зависимых модулей. На главной нет второго menu-owner из `site-header.js`; в каталоге не подключаются Hero и главный `main.js`. Подробные параметры и responsive-условия — в [SCROLL_MECHANICS](SCROLL_MECHANICS.md).

## Ресурсы и зависимости

- `assets/vendor/`: GSAP/ScrollTrigger 3.12.5, Lenis 1.3.26 и исходные лицензии; обновление версий без задания запрещено.
- `assets/works/`: шесть согласованных PNG с проверяемыми размерами/хешами.
- `assets/services/`: шесть цветных и шесть монохромных SVG; hero/audience/process/testimonials находятся в соответствующих каталогах assets.
- `assets/fonts/`: локальные Manrope 400/500/600 и лицензия v27. Защищённый `design-system-v61.css` также содержит Google Fonts import для главной: внешняя зависимость сохранена из эталона.
- `docs/asset-manifest.json`, `vendor-manifest.json`, `font-manifest.json` проверяют 40 asset/vendor/font hashes. `.gitattributes` сохраняет байты ресурсов; raw SHA motion-файлов отдельно требует корректных LF/CRLF.

Зависимости Playwright/Chromium используются только инструментами QA; project package manager или новый framework не добавлялись.

## Контракты и проверки

`docs/V62_SOURCE_SHA256.json` хранит исходный manifest архива: 17 motion hashes и исторические 437 source entries. Итоговая композиция включает иную оболочку/инфраструктуру и обновляемую документацию, поэтому full `--strict` не является критерием готовности.

`docs/V62_ON_V27_SOURCES.json` задаёт целевой контракт: 17 raw motion SHA, 25 файлов оболочки/каталога v27 и SHA полного фрагмента семи секций. `scripts/test-shared-site.cjs` проверяет его в рабочей папке вместе с templates/routes/menu owners; `docs/qa/v62-on-v27/verify-git.cjs` — в Git blobs индекса или указанного ref. Не подменять manifests ради устранения ошибок.

Офлайн-проверки, HTTP-сверка и браузерная приёмка имеют разную область действия. Актуальные команды — в [README](../README.md), [реестре](../scripts/HISTORICAL_CHECKS.md) и [QA v62](qa/v62-on-v27/README.md). Исходные v60/v27 browser runners содержат старые ожидания pin/Lenis и не служат готовой приёмкой всей текущей главной.

## История и локальные папки

`backup/`, документы v31/v60/v61 и первоначальные handoff сохранены для истории. Их старые слова «текущий» и результаты не переопределяют согласованную базу. Runtime не менялся после `09a6da3`; `edfbba1` добавил только pre-merge документацию/результаты, а `3256e53` включил всю историю в main.

Слитые feature-ветки удалены; исторические папки `output/worktrees/site-v60` и `output/worktrees/works-v27` остались в detached HEAD. Output с исходными распаковками, серверными логами и свежими прогонами не поставляется с клоном. В Git есть отдельные QA-скриншоты, JSON и видео v62. Не переносить всю папку output или архивы в web-root.

## Публикация и будущая работа

Merge в main завершён; сайт не публиковался. Хедер, футер и анимации заморожены. Остальные изменения требуют конкретного задания, а геометрия/контент могут влиять на сцены и исходный SHA-контракт. Все действия с main — через отдельные ветки/PR; публикация и следующий merge требуют своих разрешений.
