# F-Zero Nova — vaporwave orbital refresh

The existing `examples/f-zero-nova-3d/code.js` remains the entry point. Its source
is mirrored to `dist/examples/f-zero-nova-3d/code.js`. The existing homepage launch
path remains `/console.html?demo=f-zero-nova-3d`.

```sh
nvm use
pnpm dev --host 127.0.0.1 --port 3199
```

Play: <http://127.0.0.1:3199/hero-embed.html?demo=f-zero-nova-3d&w=960&h=540>

Space starts and boosts; arrows/WASD steer; Q/E retain the existing drift-step
behavior. Auto throttle, energy use, collisions, rival spawning, passing, health,
win rules and restart behavior are unchanged. Victory still requires at least
30,000 distance and first place. This cart is a straight scrolling endurance
race, not a closed lap circuit; the HUD reports distance instead of inventing laps.

## Presentation

Cobalt pavement, an animated violet aurora sky, deep violet structures, acid-green safety
edges, lane graphics, gantries and nearby orbital pylons replace the dark neon
highway. The owner explicitly removed yellow/orange accents in favor of green
and blue. Player fins, split outriggers and a striped nose strengthen the ship's
silhouette. Rivals have distinct vivid liveries, cockpit, foil and fin details.
Boost-pad stripes fit inside their existing collision footprints. New scenery
moves with the original rolling segments. Separate instanced batches carry solid
architecture and emissive signage. Leaning gateways, illuminated balconies and
facade strips add depth. A ringed planet, cloud belts, moon and rotating orbital
station establish the skyline. These objects are created once during initialization.

The camera uses a calmer 72-degree base FOV, limited boost expansion and forward
framing. Boost trails and speed streaks are strongest during boosts; existing
impact sparks remain. Three.js UnrealBloomPass uses strength 1.35, radius 0.85 and threshold 0.68,
with a smooth strength increase to 2.0 during boost. Emissive scenery supplies
bright highlights. FXAA, boost-responsive chromatic separation and vignette
complete the image. Boost entry and impacts trigger a brief 0.22-second glitch
accent; the HUD remains crisp above the postprocessed scene. The refreshed HUD uses an original racing-authority symbol,
asymmetric blocks, large position/speed numerals and compact telemetry. It scales
to the framebuffer while keeping controls in the runtime's 640×360 input space.

## Comparison captures

The browser script injects a private deterministic RNG into the two test copies,
then uses the same simulated frames and steering input for comparable captures.
The product source has no test probes. Baseline revision:
`f12a86626c2ce3809e9a76dcaf99549256a38f04`.

| Scene          | Before                                                        | After                                                       |
| -------------- | ------------------------------------------------------------- | ----------------------------------------------------------- |
| Grid/countdown | [Before](../tests/artifacts/racing/fzero-before-grid.png)     | [After](../tests/artifacts/racing/fzero-after-grid.png)     |
| Fast steering  | [Before](../tests/artifacts/racing/fzero-before-steering.png) | [After](../tests/artifacts/racing/fzero-after-steering.png) |
| Busy section   | [Before](../tests/artifacts/racing/fzero-before-busy.png)     | [After](../tests/artifacts/racing/fzero-after-busy.png)     |

There is no literal fast track corner in the original gameplay; the steering
capture is the comparable high-speed case. Camera framing intentionally changes
with the refresh, but course progress and simulated inputs match.

## Verification

```sh
pnpm exec node tests/verify-fzero-continuity.mjs
pnpm exec node tests/racing-browser.mjs
pnpm test
pnpm build:nova f-zero-nova-3d
```

The continuity check compares 75 samples over 150 simulated seconds against the
original revision: speed, position, lateral velocity, health, energy, boost,
rank, rivals, hazards and game state are identical with rendering/audio stubbed.
The Git-based comparison needs that baseline revision available locally.

Browser checks separately finish the original and refreshed event using ordinary
steering inputs, exercise retry, capture screenshots and report scene complexity
and CPU update timing. `tests/artifacts/racing/browser-report.json` records the
actual browser, profiles and outcomes. CPU update timing is not GPU frame rate;
headless software rendering is not a hardware performance guarantee. Native
Godot/RetroArch, physical controller/phone hardware, Safari and Firefox remain
unverified. The existing controller assignments were preserved. A separately tested runtime
fix prevents unpressed Start/Select aliases from overwriting A/B face buttons.
Both carts passed Babylon initialization against the production build; full
Babylon racing remains unverified.

The generated review bundle is `dist-lemon/racing/f-zero-nova-3d.nova`; native
execution is unverified. Regenerating with `pnpm build:nova` writes under the cart
folder. The broader reference review is in [Breakwater's handoff](BREAKWATER_CIRCUIT.md).

The earlier orbital pass Chromium 147 run: both before/after races finish first at exactly
30,002.4556 distance with 100 health. The comparison scene increases from 64 to
102 mesh objects and 5,032 to 10,780 triangles; sampled CPU update cost rose from
0.02 ms to 0.07 ms in this run. This measures cart update work, not GPU frame time.
The production Vite build passed with the repository-standard 8 GB Node heap;
existing large-chunk and unresolved background-asset warnings remain.

## Vaporwave review pass

Latest live captures: [race](../tests/artifacts/racing/fzero-orbital-race.png),
[boost](../tests/artifacts/racing/fzero-orbital-boost.png), and
[title](../tests/artifacts/racing/fzero-orbital-title.png).
The 150-second continuity comparison still passes after this pass. The current
browser-report.json records the rerun; earlier mesh counts above describe the
previous visual pass, not the expanded orbital scenery. UnrealBloom is the
Three.js implementation; Babylon does not provide that same postprocessing path.
