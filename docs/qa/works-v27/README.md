# Приёмка Works v27 и общей оболочки

Проверено 20 октября 2026 на базе `main` `67f75cd`. Реализация находится в feature-ветке `feat/works-shared-shell-v27`. Merge и deploy не выполнялись.

## Фактические результаты

| Проверка | Результат | Доказательство |
|---|---|---|
| Исходные тесты v60 до изменений | 69/69 | baseline и журнал запуска |
| Статические тесты после интеграции | **74/74** | `node --test --test-isolation=none scripts/test-static-checks.cjs scripts/test-shared-site.cjs` |
| Свежесть готовых HTML | PASS | `node scripts/build-site.cjs --check` |
| Ресурсы/контрольные суммы | PASS: 40 SHA256, 53 HTTP-ресурса главной совпадают с диском | `node scripts/check-project.cjs --http http://127.0.0.1:4183/` |
| Общая оболочка + Works, Chromium | **295/295** | [browser-report.json](browser-report.json) |
| Полная главная 1440×900 | 68/68, 0 ошибок | [v60-1440x900.json](v60-1440x900.json) |
| Полная главная 390×844 | 64/64, 0 ошибок | [v60-390x844.json](v60-390x844.json) |
| Полная главная 1920×1080 | 68/68, 0 ошибок | [v60-1920x1080.json](v60-1920x1080.json) |
| Полная главная 2560×1440 | 68/68, 0 ошибок | [v60-2560x1440.json](v60-2560x1440.json) |
| Регрессии v60 до/после | 5/5 + 5/5 | [до](before/before-v27.json), [после](before/after-v27.json) |
| Движение CTA, повторное подключение, mobile copyright | **6/6** | [motion-report.json](motion-report.json) |
| Неизменность основных секций и motion-модулей | 7 секций + 11 файлов совпадают | [preservation-report.json](preservation-report.json) |
| Works против архивного эталона | <0.1% различающихся пикселей ниже хедера на 390/1440/1920 | [visual-comparison.json](visual-comparison.json) |

Browser-матрица: `/` и `/raboty/` при 320×568, 390×844, 768×1024, 990×900, 1440×900, 1920×1080, 2560×1440. Дополнительно обе страницы с reduced motion при загрузке и изменение настройки во время работы Works. Все запросы страниц и ресурсов завершились без 404 и runtime errors в проверенных сценариях.

Сравнение пикселей — вспомогательный замер верхней части Works: исключена зона фиксированного хедера y<110, порог отличия канала 16/255. Значения 0.040% / 0.095% / 0.058%. Это не утверждение о полном попиксельном совпадении всего сайта или движущихся волн. Изображения и HTML ниже осмотрены визуально.

## Проверенные контракты

- Header: desktop 56 px, CTA 40; mobile 62/66; меню и footer nav Manrope 16. Открытие, Escape с возвратом фокуса, внешний клик, маршруты и refresh работают.
- Works: сетка 3/2/1, max width 1268, карточка около 412×451, radius 24, gap 16; desktop display 70, card title 24/400, copy 16/500, tags 14, inline action 16.
- Hover: transform `matrix(1,0,0,1,0,-3)`, lift .64s, shadow .82s, action #E44D1F. Arrow 20×20 и image transform `none`; cursor badge отсутствует.
- Сохранены порядок, изображения и описания всех шести проектов, маркировка прототипов/концептов. PNG и размеры проверены автоматически. У «Простора» видимая линия столешницы остаётся частью исходного изображения; замену/ретушь не выполняли. Широкой искусственной полосы или нахлёста body поверх image нет.
- Все шесть диалогов проверены на 320, 390 и 1920: открытие, ESC, возврат фокуса, блокировка документа и восстановление. Проверены переход Contacts с клавиатуры, следующий Tab к footer CTA, переход на Services главной и обратно в каталог.
- Главная: прокрутка вниз/вверх, hero/pin, доступность всех работ/услуг, шаги Process, Reviews, все FAQ, resize/orientation, reload и reduced motion. Её compact/touch native scroll сохранён; Works использует отдельного единственного владельца Lenis duration 1.2.
- Footer: три слоя 600/500/350 desktop, mobile +50; blur 19.2/16/12.8; движение каждого path в viewport и остановка вне его. Повторное подключение скриптов не создаёт дополнительные слои/observer и не сбрасывает CTA.
- CTA: начальная opacity 0/scale .8, промежуточный замер opacity .198325/scale .839665, конечная opacity 1, без translateY, .92s, однократно. Reduced motion оставляет статичные волны и видимый контент.

## Найденные и устранённые дефекты

1. В исходном Works preventDefault для плавного anchor не переносил клавиатурный фокус. Подтверждено до исправления; после onComplete фокус переходит к Contact и далее к CTA.
2. В архивном футере copyright на 390×844 оставался с opacity 0 при достигнутом max scroll. Воспроизведено на обоих источниках: fine top 785.125, viewport 844, оригинальный observer с −7% не срабатывал. Для одной последней строки добавлен observer без отрицательного margin. Её fade 2.55s, CTA-порог, wave config и движение сохранены. [Результат после исправления](works-390-footer-bottom.png).
3. Начальный тест диалога использовал паузу 80ms после Escape и дал один нестабильный результат при параллельном запуске браузеров. Проверка заменена ожиданием фактических close/focus/unlock; итоговый прогон 295/295.

## Скриншоты

| Состояние | Desktop | Mobile |
|---|---|---|
| Главная до | [1440](before/main-1440-top.png), [1920](before/main-1920-top.png) | [390](before/main-390-top.png) |
| Главная после | [1440](home-1440-top.png), [1920](home-1920-top.png) | [390](home-390-top.png), [меню](home-390-menu.png) |
| Архивный Works | [1440](before/reference-1440-top.png) | [390](before/reference-390-top.png) |
| Works после | [1440](works-1440-top.png), [1920](works-1920-top.png) | [390](works-390-top.png), [меню](works-390-menu.png) |
| Сетка | [1440](works-1440-grid.png), [все 6 на 1920](works-1920-grid.png) | [390](works-390-grid.png) |
| B2B | [normal](b2b-normal.png), [hover](b2b-hover.png) | |
| Простор | [normal](prostor-normal.png), [hover](prostor-hover.png) | |
| Footer главной | [1440](home-1440-footer.png), [1920](home-1920-footer.png) | [полный низ](home-390-footer-bottom.png) |
| Footer Works | [1440](works-1440-footer.png), [1920](works-1920-footer.png) | [полный низ](works-390-footer-bottom.png) |
| Reduced motion | | [главная](home-reduced-footer.png), [Works](works-reduced-footer.png) |

Видео hover, плавного скролла и волн записано локально через `verify-works-v27-motion.cjs` в `output/playwright/works-v27/motion/*.webm`. В Git включены скриншоты и JSON; видео остаётся локально. Новая запись содержит несколько секунд hover и более 5 секунд движения футера после раскрытия CTA.

## Как повторить

```powershell
node scripts/build-site.cjs --check
node --test scripts/test-static-checks.cjs scripts/test-shared-site.cjs
node scripts/check-project.cjs
node scripts/verify-services-static.cjs
.\start-local.ps1 -Port 4173 -NoBrowser
# В другом терминале:
$env:SYNTHECORE_URL='http://127.0.0.1:4173/'
node scripts/check-project.cjs --http $env:SYNTHECORE_URL
node scripts/verify-works-v27-browser.cjs
node scripts/verify-works-v27-motion.cjs
node scripts/verify-v60-regressions.cjs
node scripts/verify-v60-browser.cjs --only=1440x900 --phase=shared-v27
```

Для браузерных сценариев нужен установленный Playwright и Chromium; сайт от них не зависит. Локальный launcher отдельно проверен на `/`, `/raboty/`, `/raboty/index.html` и font MIME `font/ttf`, все 200.

Пределы проверки: Chromium на этой машине и эмулируемые viewport/touch; физические устройства, Safari/Firefox и production hosting в этой задаче не проверялись. Замену демо-отзывов и согласование контента перед публикацией из v60 этот PR не закрывает.
