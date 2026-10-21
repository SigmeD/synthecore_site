# SyntheCore v61 — проверенный кандидат рефакторинга анимаций

Это **полная копия сайта v61**, а не патч для публикации. Предыдущая экспериментальная дизайн-система v0.2 сохранена. Изменены только 5 JS-файлов: `js/works.js`, `js/services.js`, `js/testimonials.js`, `js/process.js`, `js/hero-scroll.js`.

## Просмотр

Запустите локальный сервер из каталога сайта через `start-local.ps1` (Windows) или `python -m http.server 4173`, затем откройте `http://localhost:4173/`.

Для автономного просмотра без сервера приложен отдельный файл `SyntheCore_v61_Motion_Refactor_Standalone.html` (поставляется рядом с архивом). В нём используются встроенные изображения и fallback шрифта.

## Проверки

```
node scripts/check-project.cjs
node scripts/verify-works-static.cjs
node scripts/verify-services-static.cjs
node scripts/check-hero-geometry.cjs
node --test scripts/test-static-checks.cjs
```

Отчёты: `docs/V61_MOTION_REFACTOR_AUDIT.md`, `docs/V61_MOTION_REFACTOR_QA.md`.

**Важно:** не вливать напрямую в `main`: сначала проверить визуальное поведение на реальном сервере, особенности тач-устройств и совместимость с последними изменениями текущего Git.
