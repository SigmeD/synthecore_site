# SyntheCore v62 — точечная правка семейства шрифта

Дата: 2026-10-20. Статус: кандидат для просмотра, не релиз.

## Что исправлено

- CSS-переменная `--sc62-text-font`: `"Manrope", Arial, sans-serif` → `"Manrope", sans-serif`.
- Точно такая же цепочка выставлена для `--sc61-font` и `--sc-font-family` в последнем слое переопределений, **без изменения** замороженных базовых CSS.
- В автономный HTML-предпросмотр добавлено подключение Manrope через Google Fonts. Файлы шрифта в архив не включаются.

## Важная проверка

`font-family` показывает лишь список предпочтений. Если шрифт Manrope не загрузился (например, нет доступа к Google Fonts), браузер отобразит доступный системный `sans-serif`. В Chrome DevTools открой `Elements → Computed → Rendered Fonts`, чтобы увидеть фактический используемый шрифт; в Network можно проверить запросы к fonts.googleapis.com и fonts.gstatic.com.

## Не менялось

Все тексты, размеры, вес шрифтов, положение секций, HTML-структура, JavaScript, параметры Lenis и GSAP, footer/waves. SHA-256 всех 17 зафиксированных CSS/JS-файлов совпадают с утверждённой v62.

## Изменённые файлы

- `css/v62-typography-content-candidate.css` — только определение CSS-переменных семейства шрифта.
- Предпросмотр `SyntheCore_v62_Manrope_FontFix_Standalone.html` — аналогичная правка плюс внешний Google Fonts `<link>`.
