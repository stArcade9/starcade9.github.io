# Coastal Signal — Token-Chapter Experience

A self-contained Next.js app implementing the QR-token chapter experience specified in [stories.md](./stories.md). Lives entirely inside this `stories/` directory and does not touch or depend on the static site at the repo root — it's meant to be deployed as its own Vercel project (see [Deployment](#deployment)).

## Architecture summary

- **Next.js App Router**, default Node.js runtime, deployed on Vercel as its own project (Root Directory = `stories`).
- **Neon Postgres** (free tier, via Vercel Marketplace) + **Drizzle ORM**, using `@neondatabase/serverless`'s WebSocket `Pool` driver (`drizzle-orm/neon-serverless`) rather than the HTTP driver, because chapter completion needs a real interactive transaction (`db.transaction`), not just batched queries.
- **Nova64** — the repo-root `runtime/` engine — is reused as-is, synced into `public/nova64/` at dev/build time (`scripts/sync-nova64.mjs`) so this app never reaches outside its own directory at request time. Chapter carts (`content/<story>/chapters/<id>/cart.ts`) are compiled to standalone ES modules under `public/carts/<story>/` by `scripts/build-carts.ts` (esbuild), matching the `cartUrl` shape the API returns. The client-side bootstrap (`public/engine/boot.js`) is a trimmed, faithful adaptation of the repo's real Nova64 bootstrap (`../src/main.js`) — same imports, same assembly order — with only the full desktop console's UI panel/debug-panel/Game-Studio-bridge code removed, since this minimal viewer has none of that.
- **Visitor identity**: an anonymous HMAC-signed cookie (`lib/visitor.ts`), separate from the experience token, so multiple visitors can scan the same permanent QR code independently (`lib/experience.ts`'s `progress` table is keyed on `(experience_id, visitor_id)`).
- **Seeds**: pure deterministic hash functions (`lib/seed.ts`) — `deriveExperienceSeed(token)` and `deriveChapterSeed(experienceSeed, chapterId)` — so a token's world (and each chapter's procedural variation) is always reproducible, not independently random per row.

See `stories.md` for the full original spec this implements.

## Local development

```bash
pnpm install
cp .env.example .env.local   # fill in DATABASE_URL and SIGNING_SECRET
pnpm db:migrate               # applies db/migrations/ to your database
pnpm db:seed                  # creates one test experience, prints its URL
pnpm dev
```

Then visit the URL printed by `pnpm db:seed` (e.g. `http://localhost:3000/x/<token>`).

To test the 24-hour countdown chapter without waiting: set `DEV_UNLOCK_DELAY_SECONDS=30` (or similar) in `.env.local` — every countdown chapter uses this instead of its real `unlockDelaySeconds` outside production (`lib/registry.ts`'s `effectiveUnlockDelaySeconds`).

### Environment variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | yes | Postgres connection string (Neon). Same variable works for local dev and production — use a Neon branch per environment if you want isolation. |
| `SIGNING_SECRET` | yes | Random secret used to HMAC-sign the anonymous visitor cookie. Generate with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`. |
| `NEXT_PUBLIC_BASE_URL` | yes | Base URL used when building QR code URLs (`{base}/x/{token}`). `http://localhost:3000` locally, `https://s.starcade9.io` in production. |
| `DEV_UNLOCK_DELAY_SECONDS` | no | Overrides every countdown chapter's delay outside production, for testing. Never set in production. |

### Tests

```bash
pnpm typecheck
pnpm test          # unit tests always run; integration tests auto-skip without DATABASE_URL
```

Integration tests (`tests/integration/`) exercise the real database-backed completion/idempotency/multi-visitor logic — point `DATABASE_URL` at a scratch Neon branch (not production) before running them for real, since they insert and delete rows.

Not automatable here: real-device testing on iOS Safari / Android Chrome (stories.md required test #11) — verify manually before shipping a batch of QR codes.

## Deployment

1. **Database**: In the Vercel dashboard, add the **Neon** integration from the Marketplace (free tier) to get a `DATABASE_URL`. Run `pnpm db:migrate` once against it (locally, with that `DATABASE_URL` in `.env.local`, or via a one-off Vercel deployment step).
2. **Vercel project**: create a **new, separate** Vercel project from this same GitHub repo, with **Root Directory set to `stories`**. This keeps it fully independent from the root static site's own Vercel/GitHub Pages deployment.
3. **Domain**: point `s.starcade9.io` at this project (per stories.md's permanent QR URL shape `https://s.starcade9.io/x/[token]`).
4. **Environment variables**: set `DATABASE_URL`, `SIGNING_SECRET`, and `NEXT_PUBLIC_BASE_URL=https://s.starcade9.io` in the Vercel project settings. Do **not** set `DEV_UNLOCK_DELAY_SECONDS` in production.
5. Push to `main` — Vercel builds and deploys automatically (`pnpm build` runs `scripts/sync-nova64.mjs` and `scripts/build-carts.ts --minify` first).

## Provisioning QR codes

```bash
pnpm experience:create --story coastal-signal --count 25
```

Generates `count` new experiences (cryptographically random tokens, deterministic seeds), inserts them into Postgres, and writes `provisioning-output/<story>-<timestamp>/` containing `experiences.csv` (serial, token, url, seed, QR filenames) plus SVG and high-res PNG QR codes per experience. Safe to rerun — every run mints fresh tokens and never touches existing rows, so running it again (same story or a new one) is always additive, never destructive.

## Content runbooks

### Add a chapter to an existing story

1. Create `content/<story>/chapters/<folder>/cart.ts` — a Nova64 cart exporting `init()`, `update(dt)`, `draw()`, reading `getChapterContext()` from `content/chapter-context.ts` for `tokenSeed`/`chapterSeed`/`complete()`. Use `nova64.mousePressed()` (managed input, resets automatically between cart loads) for tap interaction rather than a raw `window` listener — the runtime has no per-cart `dispose()` hook, so a raw listener from one chapter would leak into the next. See `content/coastal-signal/chapters/01-arrival/cart.ts` for a working example combining low-poly 3D geometry, a gradient skybox, retro post-processing presets, and the 2D particle overlay.
2. Register it in `content/<story>/manifest.ts`: add a `ChapterManifestEntry` with a new `id`, the next `order`, and `cartModule` pointing at the folder name from step 1.
3. Commit and push — Vercel deploys the change. No QR codes need to change and no new pages need to be generated (the shared `app/x/[token]/page.tsx` route serves every token).

### Launch a new story / shirt line

1. Create `content/<new-story-id>/manifest.ts` and its `chapters/` folder, same shape as `content/coastal-signal/`.
2. Register the story in `lib/registry.ts`'s `STORIES` map (one import + one map entry).
3. Run `pnpm experience:create --story <new-story-id> --count <n>` to provision and print/export its QR batch.

Every story lives side by side under `content/`, and the database's `experiences.story_id` column keeps their progress data fully separate — this is the same mechanism for every future drop, not a one-off.

## Chapter design notes

### Tone & influences

Read this as a hazy summer-night Santa Cruz boardwalk story first, a
mystery second: salt air, arcade neon, a retro cartridge that shouldn't
still work. The touchstone is a light hint of Stranger Things / Goonies /
The Lost Boys — something a little uncanny hiding just under a familiar,
sunlit beach town — but pitched toward wonder and discovery, not dread.
Concretely, that means:

- **Mystery, not menace.** The cartridge and the ocean spirit are secrets
  worth finding, not threats to survive — no jump-scares, no danger to the
  player, no "being hunted" framing. The energy is kids-on-bikes-at-night
  curiosity, not horror.
- **Keep the warm, sunlit visual register** even as the mythology gets
  stranger. The 80s-adventure references are a mood, not a genre swap — this
  should still look and feel like a bright coastal boardwalk, not a dark
  Upside-Down palette.
- **Nostalgia is the throughline**, for an 18-35 audience: real lost
  hardware, a real coast, a game that still remembers something — the pull
  is "this could almost be true," not spectacle for its own sake.

**This is an interactive story/journey, not a scored game.** Any interaction
mechanic in a chapter (steering, firing, searching, tapping) exists to make a
narrative moment feel *felt* rather than just read — not to add scoring,
competition, or difficulty for their own sake. Chapter One is a deliberate,
explicitly-requested exception in *texture*: it plays as Space-Harrier-style
arcade action (voxel invaders, projectiles, waves) because that was asked for
specifically as this story's opening register — but it still exists in
service of the ride's emotional arc (closing in on the signal), not a score.

Two constraints worth knowing before writing a new chapter's interaction:

- **No touch/mouse-release event reaches carts.** `nova64.input` exposes
  press-edge (`mousePressed`), held-state (`mouseDown`), and position
  (`mouseX`/`mouseY`) — nothing fires on release. A "drag around, then let go
  over the target" mechanic isn't buildable as written; touch interactions
  need to work as a *sequence of discrete probes* (each press is a complete
  attempt at its current position), not a drag-then-commit gesture, unless
  the mechanic is proximity-based instead (see Chapter Two below), which
  sidesteps the constraint entirely.
- **Every interaction should produce a visible response — including misses.**
  A search/collection mechanic that does nothing on a miss reads as "broken"
  or "unclear," not "not found yet." Every input should produce *some*
  immediate feedback, so the player never wonders whether it registered.

Chapter Two is a continuous shoreline walk (same drag/arrow steering as
Chapter One's rail-ride): embers of the signal are scattered along the
route, and gathering them feeds a carried flame that grows with each one,
climaxing in the flame flaring up to answer the signal back — mirroring
Chapter One's falling light with a rising one.

Embers are **magnetic**, in three phases (`EmberPhase` in the cart):

- `waiting` — sitting on its own lane, riding the shoreline toward you.
- `drawn` — inside `EMBER_ATTRACT_RADIUS`, it pulls free of the sand and
  travels to the flame under an *accelerating* pull (it hesitates, then
  rushes the last stretch — a constant-speed tween doesn't read as magnetic),
  spinning up and brightening as it closes.
- `binding` — locked to the flame: one swell, its own hue crossfading into
  the flame's amber, and an eased fade out into it. This is the moment the
  light stops being its own and becomes part of yours, and it's when the
  flame actually grows.

The attract radius is deliberately well under the full lateral span, so
steering toward an ember still matters — the walk is forgiving and tactile,
not automatic. Note this is proximity-based rather than a tap-and-hit-test,
which is also how it sidesteps the no-release-event constraint above.

### The ocean spirit (Chapter Two's `spirit` beat)

Between the walk and the flare, the walk pauses and the ocean herself rises
out of the water to explain why the coast, the boardwalk, and the cartridge
are the same old impulse in three different ages — the story's thesis stated
out loud, and the longest stretch of writing in it. Her last line ("send it
back up, where I can see it") is what gives the flare that follows its
motivation.

Two things worth knowing before editing her:

- **Her form is an original silhouette assembled from named primitives**
  (~28 spheres and capsules): head, an inner face-glow, a flowing mane, a
  tapered torso with a brighter "heart-light," jointed drifting arms, and a
  lower body that dissolves into wisps instead of resolving into legs — she's
  a ghost of the ocean and shouldn't be standing on it. Carts get no
  custom-geometry or model-loading path, so this is built shape-by-shape. Each
  part carries its own sway/bob phase; that independent drift is most of what
  sells "suspended in water" over "a rigid prop." She fades up out of nothing
  and dissolves back into it via a shared opacity ramp, and the whole figure
  swells gently in time with each spoken line.
- **Every part gets its own cloned material (`ownMaterial`).** The engine's
  `createSphere`/`createCapsule` return materials from a shared cache keyed on
  colour/transparency/opacity — and *not* on `emissiveIntensity`. Without the
  clone, parts sharing a colour and opacity would silently share one material:
  per-part glow would collapse to whichever value was set first, the per-frame
  fade would bleed across parts, and destroying her at the end of the beat
  would dispose a material the cache still hands out to meshes created later.
  Any future cart that both animates material properties per-frame *and*
  destroys the meshes afterward needs the same treatment.

### Prologue cinematics ("forgotten cartridge")

Both chapters open on an in-engine cold-open before the ride/walk begins,
built entirely with existing `nova64` primitives — no separate overlay,
video, or slide system, and no new engine API. The shared skeleton (see
`setWorldVisible`, the `prologueN` beats, and the `targetAmbient` lerp at the
top of each chapter's `update()`) is:

1. Ambient light starts near black; every emissive prop in the scene (ship
   glows, embers, planets, fly-through rings, point lights, etc.) is hidden
   via `setWorldVisible(false)` — dimming ambient alone isn't enough, since
   emissive materials ignore ambient light and would otherwise stay visible
   as a cluttered mess of glowing bits in the dark.
2. A deliberately-composed camera shot (placed through the chapter's
   `CameraRig` — never the engine's unset default) carries the caption
   beats that build the throughline: this cartridge is real lost hardware,
   lost near this coast, still faintly transmitting; the chapter is either
   catching its spark (Ch1) or giving something back to it (Ch2).
3. On the final beat, ambient lerps from ~0 up to the chapter's real
   ambient target, the prologue props are destroyed, `setWorldVisible(true)`
   reveals the world, and the chapter's normal beat sequence begins.

Chapter One's is the more elaborate of the two — five beats staged as a
cartridge failing to boot, with a continuous slow camera dolly eased on total
prologue time (*not* `beatTime`, which resets per beat and would make the push
restart with every caption):

- A decaying `enableGlitch` pass, plus a `glitchBurst` sting on the cut into
  gameplay — a corrupted picture that cleans up as the signal locks in is the
  most direct possible read of "lost before it finished loading."
- The spark flickers on layered frequencies with a periodic dropout rather
  than a clean sine, so it reads as failing hardware, not a tidy pulse.
- Shards of the cartridge orbit it, drift wide as the loss is described, then
  draw back in and fade into it on the final beat.
- The **boardwalk** fades up on the horizon as a string of unevenly twinkling
  warm bulbs — the only warm colour in an otherwise cold opening, and the
  thread the ocean spirit picks up in Chapter Two.
- Sonar rings ping outward from the spark toward those lights once they're
  visible, so the shot reads as *signalling toward the shore*.

Note that all of these props animate material properties per frame and are
destroyed together at the reveal, so they each take `ownMaterial` — see the
ocean-spirit section above for why that matters.

Extending this to a future chapter is mechanical: add the `prologueN` beats
to that chapter's `Beat` type, port `setWorldVisible`/`targetAmbient`, and
write new captions — the reveal choreography itself doesn't change.

### Score (`content/audio/score.ts`)

Nova64's audio API gives a cart exactly `sfx()` and `setVolume()` — one-shot
oscillator or noise bursts on eight channels, with no scheduler, no sustained
voice, no filter and no notion of key or tempo. That is enough for a jump or a
coin and nothing like enough for music, so the chapters carry their own small
Web Audio score engine alongside the runtime (the same treatment
`ocean-surface.ts` and `own-material.ts` get, and for the same reason: it's
this story's problem, not Nova64's, and forking the shared runtime would push
the change onto the root static site too).

Five synthesised voices — `pad`, `bass`, `arp`, `bell`, `surf` — into a
feedback delay and a compressor. No audio assets ship.

The engine is shared; the **composition is per chapter**, in
`chapters/<id>/score.ts`, as a table of `Cue`s — one per story beat:

- `setBeat()` calls `score.cue()` in the same place it sets the caption. The
  music changing *is* part of the beat changing. Tempo eases toward the cue's
  `bpm` rather than snapping, so beats can accelerate into each other.
- `score.update(dt)` is driven from the cart's `update()`, never a timer, so a
  score can't outlive the cart playing it. It schedules against
  `AudioContext.currentTime` with a look-ahead, and resyncs (dropping missed
  notes) if the clock overtakes it — otherwise one backgrounded tab renders a
  whole bar as a single cluster.
- `score.stinger()` reads the chord currently sounding, so game events land
  *inside* the harmony. Chapter Two passes its ember count straight in as a
  chord degree; degrees past the end of a voicing wrap up an octave, so eight
  pickups climb two octaves instead of repeating one noise.
- `score.setIntensity(0..1)` thickens the arpeggio and bells and opens the pad
  filter, for a long beat that has to build without a cut (Chapter One's ride
  drives it from distance, Chapter Two's walk from embers gathered).

Carts pass the score its **own** seeded generator, not the world's `rand` —
both chapters consume random values during `update()` for procedural content,
and sharing a stream would make the world depend on how long the music had
been playing.

A muted preference lives on `globalThis.__coastalSignalMuted` so a chapter
booting after the visitor muted comes up silent; the viewer's audio toggle
drives it (`viewer-canvas.tsx`).

### Camera moves (`content/camera-rig.ts`)

Nova64's camera calls are stateless, which is right while a chapter is
following the player — both chapters recompute their framing every frame — but
it means a beat wanting a *different* framing gets it as a cut.

`CameraRig.set()` is a pass-through with identical behaviour, until
`blend(seconds)` is called: then it eases from the pose held at the moment of
the cut toward the live incoming framing. An existing cut becomes a move by
adding one `blend()` call and changing nothing else about how the framing is
computed.

**The one thing to get right:** the beat must keep calling `set()` every frame
for the whole blend. A beat that places the camera once when it begins gives
the rig nothing to interpolate toward, and the camera silently never moves.
Both chapters restate their framing every frame for exactly this reason — see
Chapter Two's `spirit` and `flare` branches.

Currently used for the push into the ocean spirit's close-up and back out
(Chapter Two), the first/third-person swap and the climax framing (Chapter
One).

### Between screens (`app/x/[token]/scene-transition.tsx`)

Every screen change in the shell — connecting → touch gate → chapter →
countdown — used to be a single React render, so a chapter's climax was ripped
out mid-glow and replaced on the next frame. `SceneTransition` wraps the shell
and plays a CRT power-down and power-up across the join: the picture squeezes
to a bright line, holds on the phosphor trace while the screen underneath is
swapped, and opens back out.

- Driven off a `screenKey`. Children changing under the same key (a countdown
  ticking, a refetch landing on the same screen) re-render with no wipe.
- While closing it renders the *frozen* outgoing element tree, so the chapter
  stays mounted and playing right up to the point it is no longer visible.
- It ducks the running score through the global registry as it closes —
  otherwise the music plays at full level behind a screen that has gone, then
  stops dead when the cart unmounts.
- `prefers-reduced-motion` turns the squeeze into a cross-fade (see
  `globals.css`), along with the caption and frame animations.

### Climax staging

Both chapters resolve on the same three-stage shape — **expand, pulsate, then
collapse inward and fade** — because it is the same gesture at two scales: a
light stops being its own and becomes part of yours. Chapter Two's embers do it
eight times, small, binding into the carried flame; Chapter One's caught signal
does it once, big, taking the camera and the bloom with it.

If you write a third chapter, reuse the shape rather than inventing a new one —
it is the story's visual signature by now. Two things to hold to when you do:
every stage boundary should be continuous in scale, glow, colour and opacity
(otherwise a stage begins with a visible pop — worth checking numerically, the
maths is easy to get subtly wrong), and any bloom lift must return to the
chapter's base value before completion, so the next screen isn't handed a
blown-out frame.
