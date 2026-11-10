# Racing demo handoff — 2026-11-09

For Claude and the Windows counterpart. Read `AGENTS.md` first; it remains the
canonical repository guide. This document records completed racing work, not
additional agent rules or a separate backlog.

## Owner approval and direction

The owner approved Breakwater Circuit and the latest F-Zero orbital/vaporwave
presentation and requested committing and pushing the work to `main`.
Keep the approved direction: saturated electric blue, cyan, acid green and violet;
no yellow/orange accents. Original graphic racing-authority UI, large telemetry,
strong UnrealBloom, imaginative orbital scenery and brief boost/impact glitch.
Preserve the established gameplay and controls. Breakwater is approved as-is.

## Delivered

- `6f6cc654`: Breakwater Circuit, an original antigravity racer with Quick Race
  against five AI, Time Trial, three laps, Slip Charge, fixed-step simulation,
  checkpoint validation, recovery, persistence, audio and controller/touch input.
  Original generated GLB craft assets are included; no Wipeout code/assets copied.
- `abefe4be`: initial F-Zero presentation refresh, preserving the original straight
  30,000-distance endurance event and first-place victory condition.
- Latest F-Zero pass: cobalt pavement, illuminated city architecture and gateways,
  ringed planet and cloud belts, moon, rotating orbital station, animated violet
  aurora sky, stronger UnrealBloom and boost-responsive chromatic/glitch effects.
  Scenery is initialized once; rolling details use instanced solid/glowing batches.
- `3bea66c0`: independently tested shared input fix: unpressed Start/Select aliases
  no longer overwrite pressed A/B face buttons in the gamepad map.
- `5f2f9988`: documented the Mac MemPalace limitation without changing the shared
  Windows/WSL configuration. This Mac lacks the expected `~/ai-tools` environment.

Cart sources and their `dist/examples/` mirrors are synchronized. Detailed design,
controls, references and limitations are in `BREAKWATER_CIRCUIT.md` and
`FZERO_ORBITAL_REFRESH.md`. The browser test now waits for F-Zero's existing menu
input lock before pressing Start, avoiding a timing-dependent launch timeout.

## Local review and verification

Use Node from `.nvmrc` and pnpm. On Windows, use WSL and `nvm use`.

```sh
pnpm dev --host 127.0.0.1 --port 3199
pnpm exec node tests/verify-fzero-continuity.mjs
node --test tests/test-breakwater-racing.js
pnpm exec node tests/racing-browser.mjs
pnpm test:input
```

- F-Zero: <http://127.0.0.1:3199/hero-embed.html?demo=f-zero-nova-3d&w=960&h=540>
- Breakwater: <http://127.0.0.1:3199/hero-embed.html?demo=breakwater-circuit&w=960&h=540>
- Normal console launch remains `/console.html?demo=<cart-name>`.
- `tests/artifacts/racing/browser-report.json` records browser outcomes and sampled
  CPU update timing. CPU timing is not GPU frame rate.
- The F-Zero deterministic check compares 75 samples across 150 simulated seconds
  with original revision `f12a86626c2ce3809e9a76dcaf99549256a38f04`. Gameplay state
  remains identical. Before/after browser races finish first at 30,002.4556 distance
  with 100 health.
- Browser captures include the latest orbital title/race/boost views. Headless
  Chromium testing does not substitute for physical-device performance review.
- Review bundles live in gitignored `dist-lemon/racing/`, with SHA256SUMS.txt.
  Regenerate with `pnpm build:nova breakwater-circuit f-zero-nova-3d`; the command
  writes bundles into the cart folders. Bundling does not verify native execution.

The pre-push hook runs `pnpm ci:check` (frozen dependencies, core tests and build,
plus warn-only repository lint/format). Use an 8 GB Node heap for this large build:
`NODE_OPTIONS=--max-old-space-size=8192 git push origin main`.
Do not commit rebuilt `dist/*.html` or unrelated build output.

Latest Chromium rerun passed all full-race, retry/persistence, 4:3, widescreen,
landscape-touch and emulated-gamepad checks with no recorded runtime errors.
Breakwater simulation tests passed 8/8; input tests passed 7/7.

## Remaining verification limits

UnrealBloomPass is the Three.js path; Babylon does not provide identical
postprocessing. Earlier Babylon production-build initialization passed, but the
latest orbital pass and full Babylon races are not verified. Safari, Firefox,
physical controllers/phones, Godot and RetroArch execution remain unverified.
Audio calls were exercised but speaker output was not auditioned.

No further feature work is requested. Preserve unrelated pre-existing work:
`HANDOFF-RELEASE.md`, the dirty QuickJS submodule, the stale Godot carts folder,
`plans/UNSHIPPED-three-0186-webgpu-fix.md` and
`plans/starcade9-implementation-plan.md`. They are not part of this delivery.
