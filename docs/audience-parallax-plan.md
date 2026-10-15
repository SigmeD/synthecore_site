# Audience-copy parallax — 2026-10-14

Latest steering: restore Hero exactly from Works_v8_TEST_2_cards(1).html,
retain only local hold at full reveal and next-gesture release. Original scrub1
is confirmed through onScrubComplete; previous height/scene changes are canceled.

Preserve Hero, its reveal timeline, scene geometry, READY gate, Lenis, and all
design/interaction files. Add one independent GSAP y tween to .audience-copy.

- Offset: clamp80–140px,10% of viewport height.
- Start: existing Hero ScrollTrigger.end; no overlap with reveal/READY.
- End: start+0.7×viewportHeight, returning copy to its normal position.
- Numeric scrub0.55, ease:none; no opacity, pin, layout or section movement.
- Context cleanup and existing desktop/mobile/reduced-motion lifecycle.

Steps: record failing motion test, implement scoped tween, verify motion versus
document scroll at three sizes (hold/reverse/resize), native cleanup and cards,
prove Hero/CSS/HTML preservation, capture a short full-viewport down/up video.
