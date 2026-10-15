# Chromium: локальный доступ для проверки SyntheCore

14 октября 2026 г. В текущей сессии запуск браузера через Playwright завершался `spawn EPERM`, прямой Chromium — отказом Windows IPC. В `C:\Users\Max\.codex\config.toml` найдено `windows.sandbox = "unelevated"`. Само чтение этой настройки не доказывает, что переключение sandbox исправит конкретную ошибку.

## Подготовленный запуск

Из Проводника дважды нажмите `D:\Projects\synthecore\start-chromium.bat`. Либо выполните в обычном Windows PowerShell, запущенном самостоятельно:

```powershell
& 'C:\Program Files\PowerShell\7\pwsh.exe' -NoProfile -ExecutionPolicy Bypass -File 'D:\Projects\synthecore\scripts\start-chromium.ps1'
```

Скрипт запускает фоновый Chromium с локальным CDP на `127.0.0.1:9222` и отдельным профилем проекта. Он сохраняет PID и пути в `output/playwright/chromium-session.json`, логи — рядом. Настройки Codex и личный профиль Chrome не меняются. Флаг `-Visible` позволяет пользователю явно запросить видимое окно.

Браузер должен запускаться из обычного пользовательского терминала: запущенный агентом процесс наследует действующие ограничения. Изменить токен уже запущенной сессии настройкой сайта невозможно. Это необходимое действие пользователя для выбранного подключения, а не запрос повторного разрешения на работу с сайтом.

После сообщения `CDP available: http://127.0.0.1:9222` агент проверяет доступ:

```powershell
node scripts/check-browser-access.cjs
```

Проверка подключается к CDP, создаёт изолированный context, открывает только локальный SyntheCore и сохраняет screenshot и `browser-access.json`. Старые вкладки не инспектируются. Доступ считается настроенным только после реального `status: connected`.

Приёмка использует существующий браузер:

```powershell
$env:PLAYWRIGHT_CDP_URL = 'http://127.0.0.1:9222'
node scripts/verify-hero.cjs --reference
```

Подключение по CDP проверяется отдельно от записи видео: видеопоток может дополнительно потребовать доступ к encoder-процессу. Нельзя объявлять запись созданной по успешному CDP-подключению.

## Официальная документация

- [Playwright connectOverCDP](https://playwright.dev/docs/api/class-browsertype#browser-type-connect-over-cdp): подключение к работающему Chromium без его запуска из клиента.
- [Chrome remote debugging](https://developer.chrome.com/blog/remote-debugging-port): современный Chrome требует отдельный user-data-dir для remote debugging; здесь предусмотрен профиль проекта.
- [Windows sandbox OpenAI](https://learn.chatgpt.com/docs/windows/windows-sandbox): `unelevated` — legacy fallback; документация предпочитает MXC при поддержке устройства, иначе `elevated`. Переключение требует отдельной настройки/новой сессии и не отменяет managed policies.
- [Встроенный Browser OpenAI](https://learn.chatgpt.com/docs/browser): доступен альтернативный путь через Settings → Browser → Developer mode → Enable full CDP access и `@Browser`. Наличие соответствующего инструмента в этой сессии не подтверждено; управляемая политика может запретить включение.

## Текущий статус

Пользователь запустил start-chromium.bat. CDP http://127.0.0.1:9222 подключён: Chrome 149.0.7827.55, status connected, ошибок нет. Проверка открыла локальный сайт в isolated context, подтвердила engine lenis-gsap-scrolltrigger и сохранила [browser-access.json](../output/playwright/browser-access.json). Матрица Hero выполнена; [протокол](verification.md) и [видео](../output/playwright/hero-down-up.webm) доступны.

recordVideo из Node столкнулся со spawn EPERM encoder. Запись получена через настоящий CDP screencast и прямой запуск установленного FFmpeg; воспроизведение WebM проверено в Chromium. Настройки Codex и managed sandbox не менялись.
