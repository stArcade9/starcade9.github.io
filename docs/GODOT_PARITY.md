# Godot Host Parity

Nova64 carts run unchanged on two hosts: the web runtime (`runtime/`, Three.js or
Babylon) and the native Godot 4.x host (GDExtension + QuickJS). This document is
about keeping the two honest — what the cart-facing shim is, the semantics that
are easy to get backwards, and the two commands that catch a divergence.

For the C++ command surface see
[GODOT_HOST_CONTRACT.md](GODOT_HOST_CONTRACT.md). For the overall plan and
milestones see [`../GODOT.md`](../GODOT.md).

---

## The shim is a second copy of the runtime

`nova64-godot/godot_project/shim/nova64-compat.js` re-implements the cart-facing
`nova64.*` API on top of the Godot bridge. It is **hand-maintained**: nothing
imports `runtime/`, and no build step copies anything across. A change to
`runtime/` that is not re-ported into the shim makes the same cart behave
differently — or crash — under Godot, silently.

Two consequences worth internalising:

- **The shim answers unknown members with truthy no-op stubs.** A function that
  was never ported still passes `typeof x === 'function'`, still returns
  something, and still does nothing. Never probe the shim for a capability;
  probe its _behaviour_.
- **A divergence usually looks like a rendering bug, not a missing API.** The
  cart runs, draws something plausible, and is simply wrong — a level too dark,
  a wall in the wrong place, a player who cannot move.

```
runtime/wad.js            ──┐
runtime/backends/threejs/ ──┼── web host (Three.js / Babylon)
runtime/input.js           ─┘

shim/nova64-compat.js     ──┬── Godot host (GDExtension + QuickJS)
gdextension/src/           ─┘
         ▲
         └─ hand-ported. `pnpm test:godot:parity` is the only thing holding
            these two columns together.
```

---

## Three semantics that are easy to invert

These are not style preferences — each one shipped as a real defect and each is
now pinned by the parity suite.

### 1. Directional lights take a POSITION, not a direction of travel

`setDirectionalLight(v, …)` and `setLightDirection(x, y, z)` store `v` as a
`THREE.DirectionalLight`'s **position** and aim it at the origin
(`runtime/backends/threejs/camera.js`). The light therefore travels along `-v`.

A backend that reads the vector as a direction of travel inverts every light in
the scene. Outdoors this only looks brighter; indoors it is catastrophic,
because the light now strikes the _outside_ of every wall and interiors go
black. This is exactly what made `examples/wad-demo`'s DOOM levels render almost
unlit on the Godot host.

The parity suite pins it by recovering the light's travel direction back out of
the Euler angles the shim sends to Godot.

### 2. `createMaterial(kind, …)` names a Three.js material class

`kind` is not a hint — it selects a shading model:

| `kind`                     | Three.js class         | Shading                   |
| -------------------------- | ---------------------- | ------------------------- |
| `'basic'`                  | `MeshBasicMaterial`    | Unshaded — ignores lights |
| `'phong'`, `'lambert'`     | `MeshPhong/Lambert`    | Plain diffuse, non-PBR    |
| `'standard'`, `'physical'` | `MeshStandardMaterial` | PBR                       |

Running all of them through PBR defaults (metallic 0.05 / roughness 0.6) renders
the non-PBR kinds far too dark — in the shim it put `wad-demo` at roughly a
quarter of the web's brightness. In the Godot host `'basic'` maps to unshaded and
`'phong'`/`'lambert'` to metallic 0 / roughness 1; an explicit
`metallic`/`roughness` in the options always wins.

Changing these defaults is only safe because `'phong'`/`'basic'` are rare
(`wad-demo`, `fps-demo-3d`, `particles-demo`) while `'standard'`/`'emissive'` —
used by nearly every other cart — are deliberately left untouched. The parity
suite asserts that untouched-ness, so a future "tidy up the material defaults"
change cannot quietly repaint the whole cart library.

### 3. WAD collision comes from the segment collider, never `colSegs`

`convertWADMap()` returns a collider built from the exact linedef segments, plus
`getFloorHeight(x, z)` / `getCeilingHeight(x, z)` sector lookups. Carts must:

- take collision from `.collider` (or `.explorerCollider`);
- read floor height **every frame**, so stairs, ledges and pits work;
- call `buildReachability(collider, playerStart)` before requiring the player to
  reach anything, because doors, switches and teleporters are not simulated and
  parts of a real map are genuinely unreachable.

The legacy `colSegs` point cloud is kept for back-compat only. Used for
collision it inflates every wall to ~3.6 units thick, which seals a standard
64-unit DOOM doorway (3.2 units at this scale) shut — on E1M1 that left 1 of 53
enemies reachable.

The shim carries its own copy of this geometry, lifted verbatim from
`runtime/wad.js` so the two hosts cannot disagree about level shape.

---

## The two commands

### `pnpm test:godot:parity` — the gate

```bash
pnpm test:godot:parity     # or just `pnpm test`, which includes it
```

`tests/test-godot-shim-parity.js` converts real FreeDoom maps through **both**
implementations and requires identical walls, collider, floor heights and
reachability, plus the light and material mappings above. It needs no Godot
install — it exercises the shim as plain JavaScript.

It runs inside `pnpm test`, the blocking gate `ci-preflight` mirrors, so shim
drift fails CI rather than surfacing as a visual oddity weeks later.

**When it fails:** re-port the behaviour into the shim. Do not relax the test —
its whole value is that it is stricter than eyeballing a screenshot. It was
verified as a real gate while the fixes landed: 15/19 against the original shim,
17/19 with only the light fix, 19/19 with all three.

### `pnpm visual:check` — the spot-check

```bash
pnpm visual:check                  # both hosts, every mirrored cart
pnpm visual:check --cart=wad-demo  # one cart (repeatable)
pnpm visual:check --web-only       # skip Godot
pnpm visual:check --godot-only     # skip the browser
pnpm visual:check --list           # print the cart list and exit
```

Screenshots every mirrored cart on both hosts and writes a side-by-side contact
sheet to `tmp/visual-check/index.html` (untracked), with `report.json` alongside.

**It is not a pass/fail gate.** The two hosts do not render identically —
`01-cube` sits at roughly 55% different and is perfectly fine. The diff column
points your eye at what changed; it does not assert equality.

What it _does_ guarantee is that every shot is of a cart that actually started.
Each frame is checked for tonal spread and palette variety, which catches a dead
canvas — but a map-select menu screenshots perfectly happily, so carts that need
a keypress to begin declare a start condition in `START_OVERRIDES` and are
reported `NOT-STARTED` (exit 1) if it is never satisfied. Only `wad-demo` needs
one today; the failure message says how to add more.

Compare with `pnpm godot:visual`, which captures browser/Godot/diff PNGs for
mirrored carts and _can_ fail on a threshold
(`pnpm test:godot:visual`) — use that for tracked parity regressions, and
`visual:check` when you want to see what a change did everywhere at once.

### Picking the engine binary

Both tools resolve Godot through the shared `scripts/lib/godot-binary.mjs`, in
this order:

1. `--godot=/path/to/godot`
2. `$GODOT`
3. a known install path (4.5 preferred — `project.godot` declares
   `config/features "4.5"` — then 4.4.1)
4. whatever `godot` is on `PATH`

Known installs deliberately beat `PATH`, because a `godot` on `PATH` is
frequently older than the version this project targets. When nothing resolves,
the resolver fails loudly listing every path it tried rather than running the
wrong engine.

---

## Non-regression rule for shared-adapter changes

The voxel path (compact columns → C++ greedy mesher → split opaque/transparent
atlas surfaces) is the most fragile shared seam in the Godot host. Any shared
adapter, atlas, sampler, or fog/frustum change made to improve WAD rendering
**must not degrade voxel rendering**. Before landing one, run:

```bash
pnpm godot:visual minecraft-demo
```

plus a `voxel-creative` / `voxel-terrain` smoke, and confirm no parity drift.

---

## Known remaining divergences

Behavioural gaps (no DOM, no `fetch`, pointer-lock differences) are listed in
[GODOT_HOST_CONTRACT.md § Known Divergences](GODOT_HOST_CONTRACT.md#known-divergences-from-browser-backends).
Rendering gaps are tracked in [`../ROADMAP.md`](../ROADMAP.md) Phase 3 → _WAD
Sub-Roadmap_.

One measured gap worth recording here: after the three fixes above, mean scene
luminance on E1M1 rose from 6.6 to 21.7 (+229%), reaching 0.79× the web
reference. The remaining ~20% is a broader Three.js/Godot lighting-model
difference, not a shim defect.

---

## Related documents

| Document                                                                         | Covers                                               |
| -------------------------------------------------------------------------------- | ---------------------------------------------------- |
| [GODOT_HOST_CONTRACT.md](GODOT_HOST_CONTRACT.md)                                 | The C++ bridge command surface and capability matrix |
| [`../GODOT.md`](../GODOT.md)                                                     | Strategy, tooling, milestones G0–G6                  |
| [`../nova64-godot/README.md`](../nova64-godot/README.md)                         | Directory layout, submodules, build quick start      |
| [GODOT_VOXEL_PLAN.md](GODOT_VOXEL_PLAN.md)                                       | Voxel rendering sub-plan                             |
| [GODOT_PLAYTEST_AND_TRAILER_WORKFLOW.md](GODOT_PLAYTEST_AND_TRAILER_WORKFLOW.md) | Recording and editing native gameplay footage        |
| [`../AGENTS.md`](../AGENTS.md)                                                   | The same parity rules, as agent instructions         |
