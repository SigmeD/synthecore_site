# Works v27 and shared site shell implementation plan

**Goal:** integrate the approved Works v27, Header v24 and Footer v12 into current main, with a reviewable PR and no deployment.

**Architecture:** build-time HTML partials rendered by a dependency-free Node script. Commit generated `/index.html` and `/raboty/index.html` so static hosting and the current local launcher still work without a build server. Shared markup, UI styles, behavior and semantic tokens have one owner each. Keep homepage content and scroll modules from Git.

**Stack:** static HTML/CSS/JavaScript; existing GSAP 3.12.5, ScrollTrigger 3.12.5 and Lenis 1.3.26. No library upgrades.

## Sources and comparison

- Remote and main verified: `SigmeD/synthecore_site`, `67f75cda3a7398be7c3d7955cc2706db71f0ae6a`.
- Read `00_READ_AGENT_FIRST.md`, then handoff 01–09 and token seed. Loose download documents checked against the ZIP.
- Archive homepage differs only by Google Fonts and shared v24 stylesheet; Git JS fixes in main/menu focus, FAQ refresh, Services and Testimonials take precedence.
- All six PNG assets, vendor dependencies and existing main CSS match; do not overwrite them.
- Baseline: 69/69 static tests; main and archive screenshots at 1440×900, 1920×1080, 390×844 recorded before edits in the parent workspace `output/playwright/works-v27/`.

## Alternatives and decision

Runtime fetch of partials would introduce delayed header/footer layout and require JS for navigation. A framework migration adds unnecessary risk to the existing animation scenes. Use build-time partials instead, as authorized by handoff 01/02/04; no new visual design decisions are needed.

## Tasks

- [ ] Add contract tests before implementation: shared generation/check mode, valid routes/anchors, six catalog cards and approved assets, one wave container/engine and no old SMIL, preserved main sections and Lenis owner.
- [ ] Create `templates/pages/{home,works}.html`, `templates/partials/{header,footer}.html`, `scripts/build-site.cjs`. `node scripts/build-site.cjs --check` must reject stale generated pages; `node scripts/build-site.cjs` regenerates both. Resolve contextual anchors and `aria-current` at build time.
- [ ] Add `css/design-tokens.css`, locally delivered Manrope, shared v24 header/button styles and v23 footer typography. Preserve homepage hero text and layout. Document semantic values and exceptions in `docs/DESIGN_SYSTEM_V0_1.md`.
- [ ] Extract menu behavior from Git `js/main.js` into `js/site-header.js`, including Escape focus return, outside click and breakpoint closure. Keep all audience logic intact.
- [ ] Integrate footer partial from approved v12. Use one `css/site-footer.css`, `js/footer-waves.js`, `js/footer-reveal.js`. Preserve wave geometry/speeds/blur and CTA timing. Remove only old footer markup, styles and handlers from main; retain FAQ handlers/refresh.
- [ ] Integrate Works markup/content/assets and scoped surface/card/type/scroll styles from v27, consolidate obsolete page/footer CSS only after comparison. Extract menu/footer duplicates from Works JS. Preserve one Lenis, duration 1.2, reveal, six modal descriptions and arrow immobility. Native dialog must scroll and return focus without leaving the document locked.
- [ ] Fix local launcher directory-index resolution for `/raboty/`; retain traversal protection. Add font MIME types.
- [ ] Run build freshness, original static tests, project/resource/hash checks, both routes over HTTP. Run main browser regressions and full viewport checks. Run new browser acceptance across 320/390/768/990/1440/1920/2560, reduced motion, pointer hover, keyboard/menu/dialog and footer animation/performance.
- [ ] Visually inspect before/after screenshots, six images including Prostor/B2B, menu and both footers; record a short motion clip. Commit screenshots/report under `docs/qa/works-v27/`, keep video local.
- [ ] Independent review, fix material issues, write architecture/token/component/rollback docs, make logical commits, push feature branch and create PR into main with screenshots and factual results. No merge/deploy.

## Acceptance and rollback

Main hero/works/services/process/reviews/FAQ retain ordering and motion, with unchanged scene modules. Header desktop 56, CTA 40; primary buttons 52, arrows 20; Works H1/footer H2 70 at full desktop. Grid 3/2/1, max width 1268, card ~412×451, 24 radius, 16 gap. Hover −3px/640ms, shadow 820ms; orange inline link, fixed arrow, no cursor badge. Footer three layers 600/500/350, speed .5/.6/.7, blur 16 multipliers 1.2/1/.8; CTA opacity/scale .8→1/.92s, once.

Rollback before merge: close PR and keep main at `67f75cd`. If later merged, revert the integration commits in a new PR; never reset shared history or force-push main.
