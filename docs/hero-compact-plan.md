# Compact Hero geometry — 2026-10-14

> **Архив до рефакторинга v31.** Этот документ сохраняет постановку, реализацию и результаты своей итерации. Его слова «актуально» и «проверено» не являются приёмкой текущей страницы. Текущий вход: [старт v31](01_NEW_CHAT_START.md), [QA v31](QA_V31.md). Пути «локальный артефакт» обозначают материалы вне Git, которые могут отсутствовать в клоне.

Goal: restore the initial compact banner and place its footer near its bottom,
while retaining the accepted reveal / READY / next-gesture sequence.

Architecture: the existing #imageScrollSticky is the pinned viewport scene,
including the visible white area below the banner. Its .hero child starts at the
original responsive compact height and expands with the photo into the existing
viewport scene. This preserves the agreed final full reveal and avoids carrying
the initial white region into the handoff. One additional child-height tween in
the existing timeline; no animation of the pinned scene, extra wrapper, negative
margin, heading visibility animation or new wheel controller.

Tech stack: existing CSS Grid, GSAP/ScrollTrigger3.12.5, Lenis1.3.26.

- [x] Record initial dimensions/screenshots at1366×768,1920×1080,3840×2160.
- [x] Write a regression requiring the original banner heights, visible white
  area, unchanged title/CTA/photo frame and footer gap20–40px.
- [x] Replace active banner100svh with active scene height/min-height100svh. Anchor the
  desktop footer to the bottom of its existing grid, with responsive inner padding.
  Keep initial-photo crop unchanged, then expand the child banner and its photo
  together to the scene bounds, accounting for the moving footer in text colours.
- [x] Verify initial/half/READY/departure/reverse, uniform crop and unchanged
  wheel checkpoint; cover resize, keyboard, native/mobile/reduced and audiences.
- [x] Save equal-viewport before/after frames, update preservation checks and
  current documentation. No recording, dependencies or HTML changes.
