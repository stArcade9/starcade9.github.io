# WCAG Accessibility Plan

**Status:** planned / incremental. Not the current main focus — but tracked, so
we *capture, measure, and improve* deliberately over time rather than bolting it
on at the end. Target standard: **WCAG 2.2 Level AA** (with select AAA where
cheap).

This plan is Nova64-specific: our hard problem is that carts render to a
**`<canvas>`** (opaque to assistive tech) with **on-canvas "buttons"** that aren't
real DOM, plus an aesthetic (neon, bloom, glitch, strobe, auto-advance) that
trends *away* from accessible defaults. See the per-cart guidance in
[CINEMATIC_3D_CART_GUIDE.md](./CINEMATIC_3D_CART_GUIDE.md#accessibility--make-the-vibe-inclusive).

---

## Guiding principles

1. **Default stays bold; one toggle makes it inclusive.** Ship the full vaporwave
   assault, but a reduced-motion/high-contrast path must make it safe and usable.
   Inclusive ≠ watered-down.
2. **Canvas needs a DOM twin.** Anything interactive drawn on the canvas needs a
   real, focusable, labeled DOM control that does the same thing.
3. **Measure before/while improving.** Every phase has a baseline and a metric so
   we can see progress, not vibes.
4. **Bake it into the platform, not each cart.** Solve it once in the host/runtime
   and cart-helper APIs so every future cart inherits it.

---

## Phase 0 — Foundations & quick wins (cheap, do first)

Low-risk changes that move the needle immediately:

- [ ] `prefers-reduced-motion` honored: disable glitch bursts / RGB-shift / shake,
      soften bloom and flicker when set. (Runtime flag + cart helper.)
- [ ] Canvas has `role="img"` + a meaningful `aria-label`; updates per scene.
- [ ] A visually-hidden `aria-live="polite"` status region that announces scene
      changes and narration/caption text.
- [ ] No keyboard trap; `Space`/pointer always work; `Enter` never the sole
      confirm (it's the console Restart).
- [ ] Document the known gaps (this file) and link it from the cart guide. ✅

## Phase 1 — Capture (audit & instrument)

Establish what's actually broken and stand up the tooling:

- [ ] **Automated audit**: add `axe-core` + Lighthouse a11y runs to CI for the
      console shell and a representative cart; record the score as a baseline.
- [ ] **Manual passes**: keyboard-only walkthrough, screen-reader walkthrough
      (NVDA/VoiceOver), 200% zoom, mobile screen-reader (TalkBack/VoiceOver).
- [ ] **Photosensitivity scan**: run the Harding/PEAT-style flash analysis on the
      glitch/bloom/strobe sequences; log any > 3 flashes/sec or large high-contrast
      area transitions.
- [ ] **Inventory interactive surfaces** across carts (CTAs, menus, on-canvas
      buttons, text input) — the list of things that need DOM twins.
- [ ] Pick the **accessible-control pattern** (see "Pattern spec" below) and
      prototype it in `the-last-save-file` (CTAs + city verbs + live narration).

**Exit metric:** baseline axe/Lighthouse scores recorded; a written gap list with
each item mapped to a WCAG 2.2 success criterion.

## Phase 2 — Measure (targets & gates)

- [ ] Per-criterion **WCAG 2.2 AA checklist** with status (pass / fail / n/a) for
      the console + the cart-helper UI components.
- [ ] **CI gate**: axe has zero criticals on the shell; Lighthouse a11y ≥ agreed
      threshold; build fails on regressions.
- [ ] **Contrast budget**: enforce ≥ 4.5:1 for body text, ≥ 3:1 for large text/UI
      (caption bands, buttons) — codify the palette pairings that pass.
- [ ] **Flash budget**: automated check that no sequence exceeds the flash
      threshold with reduced-motion **off** is acceptable, and is fully removed
      with reduced-motion **on**.
- [ ] Track a single **"a11y health" number** over time (composite of the above).

## Phase 3 — Improve (build it into the platform)

Prioritized by impact × reuse:

- [ ] **Accessible control layer** (cart-helper API, e.g. `nova64.a11y`): register
      on-canvas controls; the runtime renders matching focusable DOM
      links/buttons (labeled, keyboard-operable, visible focus, ≥44px) overlaid on
      the canvas, kept in sync with scene state.
- [ ] **Live narration API**: `nova64.a11y.announce(text)` → polite live region;
      auto-announce captions/scene changes.
- [ ] **Settings**: in-console accessibility menu — reduced motion, high contrast,
      larger text, disable audio-only cues, captions on. Persist via storage.
- [ ] **Focus management**: logical tab order, visible focus rings, focus moves to
      new actionable content (e.g. when CTAs appear), `Esc`/back behaves.
- [ ] **Captions & transcripts** for any audio/video; never audio-only signals.
- [ ] **Text input** uses real DOM inputs (native keyboard/IME) — already the
      mobile-first rule.
- [ ] Roll the pattern across existing carts; add it to the new-cart template &
      checklist so it's default-on going forward.

---

## Pattern spec — the "accessible canvas cart"

The reusable recipe Phase 3 will productize:

- The cart **declares** its interactive controls (label, action, and the canvas
  rect they correspond to) instead of only drawing them.
- The runtime maintains a DOM overlay of real `<a>`/`<button>` elements:
  - Labeled (`aria-label`), keyboard-focusable, **visible focus** styling, min
    44×44px hit area, mapped over the canvas position (or an `sr-only` group that
    becomes visible on focus as a fallback).
  - Real navigations are `<a href>` (work without JS, SR-friendly by default).
- A single polite **live region** narrates scene changes and caption text.
- The canvas carries `role="img"` + a scene-appropriate `aria-label`.
- A global **reduced-motion** signal gates all glitch/strobe/shake/excess-bloom.

---

## Ownership & cadence

- Revisit this plan **once per milestone**; tick boxes, update the baseline.
- Every new cart: at minimum hit the **Phase 0** boxes (they're in the cart
  checklist). New interactive surfaces adopt the Phase 3 pattern as it lands.
- "Definition of done" for an accessibility item: criterion identified, fix
  shipped, automated check (or documented manual check) prevents regression.

> North star: a photosensitive, keyboard-only, or screen-reader player can get
> through *the whole story* — boot → room → city → invite — and act on the CTAs,
> with the reduced-motion toggle on. We're not there yet; this is how we get
> there, one measured step at a time.
