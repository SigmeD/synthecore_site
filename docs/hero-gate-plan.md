# Hero checkpoint — 2026-10-14

> **Архив до рефакторинга v31.** Этот документ сохраняет постановку, реализацию и результаты своей итерации. Его слова «актуально» и «проверено» не являются приёмкой текущей страницы. Текущий вход: [старт v31](01_NEW_CHAT_START.md), [QA v31](QA_V31.md). Пути «локальный артефакт» обозначают материалы вне Git, которые могут отсутствовать в клоне.

The supplied audit replaces the opacity-based handoff. Keep one reveal timeline,
one Lenis instance and one GSAP ticker. Remove the second section timeline.

1. Measure the existing pin and record the failing physical heading position.
2. Size the animated desktop banner to the available viewport. The photo fills
   that actual banner; existing content coordinates, edge padding and section
   spacing remain unchanged. Native/mobile/reduced-motion layouts stay intact.
3. Clamp only downward wheel input crossing the reveal endpoint through Lenis
   virtualScroll. Let its existing easing finish at that endpoint (SETTLING),
   then hold READY. Consume decaying wheel tails; a separate discrete wheel or
   renewed precision-input acceleration enters LEAVING. No unlock timer.
4. Reverse wheel, keyboard, anchor navigation and native scrolling bypass the
   checkpoint. Refresh reconciles an occupied checkpoint with the new endpoint.
5. Verify physical coordinates and full reveal at three desktop sizes, natural
   movement of the whole next section, gesture tails, reversal, resize, native
   fallbacks, navigation and unchanged audience interaction. Save frames/logs.

WheelEvent has no portable momentum-phase field. The classifier can be verified
against explicit event sequences, but an actual hardware trackpad audit remains
necessary to claim reliable recognition on a particular device.
