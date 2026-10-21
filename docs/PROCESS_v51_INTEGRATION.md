# SyntheCore — интеграция блока «3 шага до запуска» (v51)

**Основа:** `SyntheCore_SITE_v46_NEXT_CHAT_HANDOFF(2).zip` → `BASELINE_SyntheCore_v46_Full_Site.zip`, SHA-256 `a5969b2278f258229c7025b671b67198286d949d6e7a14eb63d65d12a1176ac8`.

**Результат:** утверждённый блок из прототипа v50 добавлен в полный сайт между `#services` и `#contact`. Оригинальные Hero, Audiences, Works, Services и Contact перенесены байт-в-байт из v46. Новый блок не создает Lenis, GSAP, ScrollTrigger и не перехватывает прокрутку.

## Изменения относительно v46

- `index.html` — CSS-подключение, HTML-секция `#process` и подключение `js/process.js` после Services.
- `css/process.css` — внешний вид и адаптив нового блока. Заголовок Inter regular 400, без точки.
- `js/process.js` — hover, focus и click подсветка кругов и линии, IntersectionObserver без scroll hijacking.
- `assets/process/process-background.png` — отдельный голубой фон (2400×1150).
- `assets/process/process-illustration.png` — самостоятельная PNG-иллюстрация с альфа-каналом (1228×793), `object-fit:contain`.
- `assets/process/process-illustration-source.webp` — исходный прозрачный WebP для редактирования/переноса.
- `scripts/verify-works-static.cjs` — обновлено ожидаемое количество секций (с 5 до 6) и список JS-файлов, только проверка структуры.

## Не менялось

`css/main.css`, `css/works.css`, `css/services.css`, `js/hero-scroll.js`, `js/main.js`, `js/works.js`, `js/services.js`, все кейсы и ассеты утверждённых блоков.

## Проверка и выпуск

Отчёт: `docs/PROCESS_v51_QA.md`. Новый код локально включён в ZIP; это не деплой и не Git merge. Версия v46 остаётся исходной точкой возврата.
