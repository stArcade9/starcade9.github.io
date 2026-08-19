# Cart Consolidation — Handoff (2026-06-24)

**Goal:** make `examples/` (web) the **single source of truth** for every cart, and
prove parity by pointing Godot + RetroArch at the web carts, keeping the old
versions as `_old` backups until parity is verified, then deleting them.

**Status:** historical handoff. The consolidation and parity fixes were committed
as `b9b9995` (`Consolidate carts and fix Nova64 parity regressions`). This file
is kept as background context; see the current source tree for the authoritative
state.

Current follow-up from the metaverse pass:
- `examples/metaverse` has been restored as the source of truth for the
  metaverse framework and its headless tests.
- `scripts/godot.sh sync` tolerates the local Windows junction state where
  `nova64-godot/godot_project/carts/metaverse` already points at
  `examples/metaverse`.

---

## What's done

### Godot — junctions to web ✅
- Every cart in `nova64-godot/godot_project/carts/<cart>` is now a **Windows
  directory junction → `examples/<cart>`** (78 of them). The original Godot cart is
  preserved as `carts/<cart>_old`.
- The Godot picker lists **both** `<cart>` (web) and `<cart>_old` (original) — that's
  the intended A/B parity view.
- The 9 conformance carts (`00-boot`…`10-stress`) were **moved into `examples/`** so
  they have a web home too.

**Junction mechanics (important):**
- Create with PowerShell: `New-Item -ItemType Junction -Path <link> -Target <abs target>`
  (or `mklink /J`). **No admin needed.**
- ❌ WSL `ln -s` symlinks do **not** resolve for native Windows Godot/RetroArch.
- ❌ Windows *symlinks* (`New-Item -SymbolicLink`) need admin / Developer Mode.
- ⚠️ **Junctions are local-only — NOT git-committable.** The eventual committed
  end-state is undecided: (a) a setup script that recreates junctions on checkout,
  (b) point Godot's `res://carts` at `../../examples` directly, or (c) copy-sync.

### RetroArch — web-built `.nova` ✅
- `retroarch/games` → renamed `retroarch/games_old` (backup: 22 `.js` + 15 `.nova`).
- **`.nova` live ONLY in `examples/<cart>/<cart>.nova`** (user requirement — no
  `retroarch/games` folder recreated, no duplicate copies).
- **28 `.nova` built** from web sources (15 originally had `.nova` + 13 that were
  `.js`-only RA carts, incl. wizardry-3d, demoscene).
- The user's RetroArch playlist `C:\RetroArch-Win64\playlists\games.lpl` was
  **repointed**: all "without web" entries (`retroarch\games\<cart>.{js,nova}`) →
  `examples\<cart>\<cart>.nova`. Backups: `games.lpl.before-consolidation.bak`,
  `games.lpl.bak2`. Verified: 0 broken paths, 28 `.nova` resolve, 67 "web" entries
  (→ `examples\<cart>\code.js`).
- RA playlist model: **"web" entry = raw `examples/<cart>/code.js`** (core runs it
  directly); **"without web" = the `.nova` bundle**.

### `.nova` bundler ✅ — `scripts/build-nova.mjs` + `pnpm build:nova`
- Zero-dep ZIP writer (raw deflate + self-contained CRC32). Matches the core's
  `extract_nova_code_js` (raw inflate, `-MAX_WBITS`).
- **Always emits a `manifest.json`** — the cart's own if present, else synthesized
  `{ name, title, version, main: "code.js", assets:[discovered] }`. The core reads
  `manifest.main` to find the entry, so this is required.
- Output: `examples/<cart>/<cart>.nova`. Excludes `*.nova`/`*.import`/`*.md`.
- `pnpm build:nova <cart…>` or `pnpm build:nova --all` (rebuilds every cart that has
  a colocated `.nova`).
- The repo also has an official packager `retroarch/tools/package_example_cart.py`
  (requires an existing manifest.json, outputs to `retroarch/games`) — reconcile
  with `build-nova.mjs` if a single tool is wanted.

### Misc fixes
- **WAD:** web wad-demo does `fetch('/assets/freedoom1.wad')`; the Godot shim maps
  `/x` → `res://x`. Copied `freedoom1.wad` → `nova64-godot/godot_project/assets/freedoom1.wad` (28 MB).
- **indie-odyssey BigInt error (FIXED):** `colorFromHex` (shim line ~78) did
  `hex | 0` on a BigInt → "cannot convert BigInt to number". Added
  `if (typeof hex === 'bigint') hex = Number(hex);` in
  `nova64-godot/godot_project/shim/nova64-compat.js`. Verified headless: 0 errors,
  cart loads. **This helps any cart that passes a BigInt color.**

---

## Parity findings (web carts on Godot)

User reviewed Godot: **most non-`_old` (web) carts "just work."** Exceptions found:

1. **indie-odyssey** — BigInt color error → **FIXED** (shim, above).
2. **space-harrier-3d — transparent-clear black screen (resolved later):**
   - `draw()` calls `nova64.draw.cls(rgba8(0,0,0,0))` — a **transparent** clear so the
     3D shows through. On Godot, `rgba8(0,0,0,0)===0`, and `colorFromHex(0)` (since
     `0` is not `> 0xffffff`) returns **opaque** black (alpha defaults to 1) → the 2D
     overlay fills opaque black over the 3D → black screen. (Start screen uses an
     opaque `cls`, so it shows — matches "start screen ok, game black".)
   - Later work aligned Godot transparent overlay clears with the web behavior
     and added the material alias needed by the cart. Keep this note as the
     original diagnosis, not an active blocker.

---

## RetroArch caveats / open
- The rebuilt `.nova` carry **web** code. Loading is fixed (manifest-based);
  whether each runs correctly on the core is the same per-cart parity work as Godot.
- `indie-odyssey.nova` is ~44 MB (bundles its full manifest asset list) — right-size
  what RA actually needs.
- Deploy/playlist scripts that referenced `retroarch/games` need repointing to
  `examples` (or regenerate via `build:nova`) — `games_old` is the backup.

## Post-commit notes
- Generated `.import` sidecars and `.nova` bundles were committed as part of the
  consolidation snapshot where needed.
- Local-only backups/scratch are ignored: `retroarch/games_old/`, `tmp/`, and
  `.playwright-mcp/`.
- Godot cart junctions are still local-only. The committed source of truth is
  `examples/`; scripts must either copy from there or tolerate the junction.

## Backups (safe to delete only after parity verified)
- Godot: `carts/<cart>_old` (78), and the originals are intact.
- RetroArch: `retroarch/games_old`, `games.lpl.before-consolidation.bak`, `games.lpl.bak2`.
