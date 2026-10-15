# План исправления hover preview

**Goal:** Одна карточка по намеренному hover/focus/tap, без выбора от скролла.

**Architecture:** Существующие три статьи как варианты контента одной поверхности, CSS-анимация появления, изолированное управление pointer/focus/tap. Удаляются deck timeline и audience ScrollTrigger; Hero/Lenis не редактируются.

**Stack:** Существующие HTML/CSS/JS, локальные библиотеки скролла, Playwright-core/CDP для проверки.

- [x] Изучить текущие причины автопоказа, создать backup.
- [x] Новая acceptance воспроизвела 11 нарушений начального состояния до изменения кода.
- [x] Удалить deck CSS и JS; вернуть null selection, coordinate-based hover, dismiss при скролле/leave, focus/Escape и tap toggle.
- [x] Проверить сценарии в браузере и сохранить screenshots closed/0/1/2 при одинаковых viewport. 11/11 passed; дополнительные Tab-out/rapid/resize/native touch cases passed.
- [x] Снять live Roveia1920×1080 closed/0/1/2/leave и проверить визуально. Capture проверяет положение заголовка после стабилизации прокрутки.
- [x] Подтвердить сохранность вне #audiences, обновить описание текущей версии, сохранить протокол и список файлов.
