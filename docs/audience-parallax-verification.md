# Hero из Works_v8 и подтягивание «С кем работаем»

> **Архив до рефакторинга v31.** Этот документ сохраняет постановку, реализацию и результаты своей итерации. Его слова «актуально» и «проверено» не являются приёмкой текущей страницы. Текущий вход: [старт v31](01_NEW_CHAT_START.md), [QA v31](QA_V31.md). Пути «локальный артефакт» обозначают материалы вне Git, которые могут отсутствовать в клоне.

Последнее прямое указание пользователя задаёт эталон Hero:
`D:\downloads\SyntheCore_Works_v8_TEST_2_cards (1).html`.
Прежние варианты с растущей высотой баннера отменены.

Hero восстановлен по этому файлу: исходная компактная и постоянная высота,
исходное расположение текста/фото/CTA/footer, прежняя маска и равномерное
масштабирование фотографии. duration1.2, scrub1, end1.1×viewportHeight.
Функции measure/renderTones, последовательность reveal и CSS вне согласованных
audience-переопределений сверены с извлечённым эталоном. Раздел Works из файла
не переносился: текущие карточки, разметка и остальные разделы сохранены.

Единственное дополнение к Hero — локальная контрольная точка. Lenis доводится
до end; затем ожидается реальное завершение исходного scrub через
[onScrubComplete](https://gsap.com/docs/v3/Plugins/ScrollTrigger/).
READY возможен только при физическом конце и timelineProgress1. Остаточная
инерция потребляется; следующий намеренный жест разрешает LEAVING. Нет нового
таймера, принудительного окончания reveal, отдельного Lenis или собственного RAF.
Синхронизация остаётся через [существующий GSAP ticker](https://github.com/darkroomengineering/lenis#gsap-scrolltrigger).

Добавлен независимый tween только `.audience-copy`: начальный y80/108/140px
для1366×768/1920×1080/3840×2160; конечный y0. Start=Hero.end,
end=start+0.7×viewportHeight, scrub0.55, ease:none. Заголовок и список движутся
вместе внутри секции. Реальная высота/отступы секции, расположение соседних
блоков, opacity и дизайн карточек не изменяются.

В исходной компактной геометрии на высоких экранах часть следующей секции
может находиться в viewport до освобождения Hero. Её дополнительное движение
не запускается до разрешённого перехода. Исходную геометрию выбранного HTML
не подменяли растягиванием баннера или скрытием через opacity.

Контекст GSAP восстанавливает transform при переходе в native/mobile/reduced
motion. На resize новое смещение пересчитывается, transform сохраняется на
текущем прогрессе. `overflow:clip` секции проверен: видимые строки не обрезаются.
Карточки продолжают работать только по намеренному hover/focus/tap.

## Проверки

- `verify-hero-v8-reference.cjs`: прямое сравнение с переданным HTML в браузере,
  три разрешения, start/middle/full/reverse. Совпали bbox Hero/title/frame/footer/CTA,
  маска, image transform, затемнение, font family, scrub и pin end.
- `verify-audience-parallax.cjs`: три разрешения, дополнительное движение40/54/70px
  на половине диапазона сверх обычной прокрутки; возврат к0, wheel-stop без
  отскока, reverse, refresh/resize, отсутствие перерасчёта документа/соседей,
  cleanup и отсутствие эффекта на mobile/reduced motion.
- `verify-parallax-checkpoint.cjs`: физический scroll уже завершён, но исходный
  scrub ещё догоняет; READY ждёт progress1. Hold сохраняется, следующий жест
  запускает copy. Нативное прерывание во время catch-up не блокирует скролл.
- `verify-audience-preview.cjs`:11 конфигураций, hover/focus/tap, Escape,
  неподвижный курсор, reduced motion и отсутствие библиотек.
- `check-project.cjs`: сохранение source Hero, HTML/main.js, audience CSS,
  ассетов и зависимостей;11 хешей и12 HTTP-ресурсов. Crop-тесты:60 состояний.

Логи находятся в `output/playwright/audience-parallax/`:
`hero-reference-equivalence.json`, `acceptance.json`, `checkpoint.json`,
`recording.json`, `video-verification.json`.

Короткая запись вниз и обратно (локальный артефакт: `output/playwright/audience-parallax/transition-final.webm`)
— около11.6s,1920×1080. Содержит раскрытие, устойчивый полный Hero, следующий
жест, подтягивание и обратное движение. Это реальные полные кадры Chromium;
WebM кодируется из записанной последовательности без интерполяции изображения.
Физический тачпад и другие браузеры не проверялись; переносимость определения
инерционного хвоста ограничена отсутствием универсального momentum-phase в WheelEvent.

## Изменённые файлы

Приложение: `js/hero-scroll.js`; `css/main.css` — отмена прежнего изменения
Hero и восстановление CSS переданного эталона. `index.html`, `js/main.js`,
`js/hero-geometry.js`, карточки и ассеты не изменены.

Проверки/запись: новые `scripts/verify-audience-parallax.cjs`,
`scripts/verify-hero-v8-reference.cjs`, `scripts/verify-parallax-checkpoint.cjs`,
`scripts/record-audience-parallax.cjs`, `scripts/encode-audience-parallax-video.cjs`;
обновлены `scripts/check-project.cjs`, `scripts/verify-audience-preview.cjs`
(фильтр отдельной конфигурации и stack trace ошибок).
Документация: этот отчёт, `docs/audience-parallax-plan.md`, README и актуальные
дополнения в `docs/00_MASTER_CONTEXT.md`, `docs/01_NEW_CHAT_START.md`.
Backup до начала задачи — `backup/audience-parallax-before-2026-10-14/`.

```powershell
node scripts/verify-hero-v8-reference.cjs
node scripts/verify-audience-parallax.cjs
node scripts/verify-parallax-checkpoint.cjs
node scripts/verify-audience-preview.cjs
node scripts/check-project.cjs
```
