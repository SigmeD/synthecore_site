# Documentation after the v62 merge

**Goal:** Describe main after PR #6, merge 3256e536615c216fae8a92caa129ca180bd022e3, while preserving historical evidence and all runtime bytes.

**Scope:** README, AGENTS, developer handoff, architecture, scrolling, release/integration status, QA index and check registry. Mark original archive handoffs as historical. Do not edit HTML/CSS/JS, manifests, templates, assets or test implementations.

- [x] Verify clean checkout, merged PR #4/#6 and commit; create ordinary branch docs/v62-post-merge-state from main.
- [x] Rewrite current entrypoints and implementation descriptions from actual source; distinguish main approval from publication.
- [x] Record branch cleanup, detached worktree preservation, localhost/launcher defaults, historical strict exceptions and browser-script prerequisites.
- [x] Mark old handoffs/master context as historical without rewriting their original evidence.
- [x] Check Markdown links against Git files, inspect documentation-only diff, verify 17 motion hashes and Git source contract, and request read-only review.
- [ ] Commit and push documentation branch and open a PR. Do not merge or publish without a new instruction.

Verification on the documentation checkout: 75/75 existing static tests, 17/17 raw motion hashes, HEAD source contract 25/25 v27 and all seven v62 sections, build --check, current offline checks and local Markdown links passed. Independent read-only review found no issues. Only Markdown paths are changed; original manifests, QA evidence and runtime files are preserved. Browser reruns are unnecessary for documentation-only changes; recorded browser results are labelled historical and not reported as a new run.
