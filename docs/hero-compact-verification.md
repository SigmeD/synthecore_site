# Компактный начальный Hero

> **Архив до рефакторинга v31.** Этот документ сохраняет постановку, реализацию и результаты своей итерации. Его слова «актуально» и «проверено» не являются приёмкой текущей страницы. Текущий вход: [старт v31](01_NEW_CHAT_START.md), [QA v31](QA_V31.md). Пути «локальный артефакт» обозначают материалы вне Git, которые могут отсутствовать в клоне.

14 октября2026. Исправление по замечанию пользователя о растянутом голубом
баннере и нижней строке, удалённой от его края.

## Что исправлено

Предыдущие кадры `start` действительно соответствовали началу страницы:
scrollY0, timelineProgress практически0, до первого wheel. Полноэкранное правило
`#imageScrollSticky.is-image-animated > .hero {height:calc(100svh - 2 * var(--hero-edge))}`
включалось сразу после инициализации, растягивая фон вокруг компактного контента.
Три max-content ряда не использовали оставшееся место, поэтому footer не был
привязан к низу баннера.

Полноэкранная высота перенесена на закреплённую сцену `#imageScrollSticky`:
height/min-height100svh. Сам `.hero` начинается с исходной адаптивной высоты:
`clamp(620px,74.2svh,968px)`; при viewportHeight≤790px — `max(600px,92svh)`.
Белая область под начальным баннером снова видна. Размер фотографии и позиции
заголовка/CTA/боковых текстов на старте не изменены.

Последний desktop-ряд CSS Grid теперь `minmax(38px,1fr)`, footer align-self:end,
нижний внутренний отступ `clamp(20px,2.5svh,40px)`. Это также применяется к
desktop reduced motion; мобильные правила не затронуты.

Ранее согласованный финальный раскрытый Hero сохраняется: при прокрутке высота
визуального дочернего баннера растёт вместе с фото от компактного значения до
внутренней высоты сцены. Добавлен один tween высоты дочернего `.hero` в ту же
timeline. Закреплённый родитель, его высота и spacer при этом не анимируются;
документ не увеличивается по ходу раскрытия. Это устраняет перенос начальной
белой области в конец раскрытия и сохраняет естественный вход следующей секции.

`measure()` читает компактный размер и окончательные границы отдельно. Фото
масштабируется равномерно прежним crop-алгоритмом. Footer следует нижнему краю;
при расчёте цвета его букв учтено это перемещение. На refresh измеряется CSS-старт,
после invalidate timeline синхронно возвращается к сохранённому прогрессу.

Логика Lenis gate, настройки ScrollTrigger, duration, фотографии, шрифты,
затемнение, цвета, тексты, HTML, карточки и меню сохранены. После раскрытия
состояние READY удерживается; только новый жест начинает уход всей сцены.
В READY heading.top остаётся848/1162/2272px для трёх целевых окон, opacity1,
transform:none. Reverse возвращает компактный баннер. На mobile/reduced движение
баннера и wheel gate отключены.

## Начальные замеры

Все кадры сняты при scrollY0. Геометрия фотографии — исходное окно её отображения.

| Окно | Hero: до → после,px | Footer → нижний край: до → после,px | Фото,px | Сдвиг title/CTA |
|---|---:|---:|---|---|
| 1366×768 | 740.7 → 707 | 242.0 → 20 | 558.8×222.7 | 0/0px |
| 1920×1080 | 1044 → 801 | 351.6 → 27 | 549.4×309.0 | 0/0px |
| 3840×2160 | 2124 → 968 | 1281.6 → 40 | 546×307.1 | 0/0px |

Галерея до/после, А/Б/В и reverse (локальный артефакт: `output/playwright/hero-compact/comparison.html`).
В браузере: http://127.0.0.1:4173/output/playwright/hero-compact/comparison.html

Начальный кадр1920×1080 (локальный артефакт: `output/playwright/hero-compact/after-1920x1080-start.png`) ·
Полное раскрытие (локальный артефакт: `output/playwright/hero-compact/after-1920x1080-B.png`) ·
Переход следующим жестом (локальный артефакт: `output/playwright/hero-compact/after-1920x1080-C.png`).

## Проверки

`verify-hero-compact.cjs`: три desktop-размера, белая область в начале,
неизменные координаты/размеры начального фото/title/CTA, footer20–40px,
изменение высоты только с прогрессом раскрытия, постоянная высота документа,
полное раскрытие и hold, следующий жест, reverse, resize/refresh посередине
и reduced motion. Логи — acceptance.json (локальный артефакт: `output/playwright/hero-compact/acceptance.json`).
Начальные значения — до (локальный артефакт: `output/playwright/hero-compact/before-geometry.json`)
и после (локальный артефакт: `output/playwright/hero-compact/after-geometry.json`).

Повторены проверки существующего gate, его пограничных прерываний, общих режимов
Hero и hover/focus/tap карточек. Статичный снимок служит доказательством геометрии;
механика проверяется реальными браузерными событиями и прогрессом/координатами.
Ограничение аппаратного тачпада из предыдущего отчёта сохраняется: проверены
заданные потоки событий, реальное оборудование и другие движки не тестировались.
Видеозапись не создавалась.

Live Roveia повторно снят при тех же трёх viewport; в reference-geometry.json
разделены scene и wrapper. Восстановлена исходная компактная геометрия SyntheCore,
а не размеры отдельных элементов другого сайта: сравнение со старой записью
не подменяет проверку фактических CSS-размеров.

## Файлы

Приложение: `css/main.css`, `js/hero-scroll.js`.
Проверки: новые `scripts/audit-hero-compact.cjs`, `scripts/verify-hero-compact.cjs`,
`scripts/build-hero-compact-report.cjs`; обновлён `scripts/check-project.cjs`.
Документация: этот отчёт, `docs/hero-compact-plan.md`, `README.md`,
`docs/hero-gate-verification.md`, `docs/00_MASTER_CONTEXT.md`,
`docs/01_NEW_CHAT_START.md`, `docs/v23-animation-notes.md`.
Артефакты: `output/playwright/hero-compact/`;
backup: `backup/hero-compact-before-2026-10-14/`.

```powershell
node scripts/verify-hero-compact.cjs
node scripts/verify-hero-gate.cjs
node scripts/verify-hero-gate-edge.cjs
$env:PLAYWRIGHT_CDP_URL = 'http://127.0.0.1:9222'
node scripts/verify-hero.cjs
node scripts/verify-audience-preview.cjs
node scripts/check-project.cjs
node scripts/check-hero-geometry.cjs
```
