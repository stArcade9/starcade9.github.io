
> **Private ops doc.** Gitignored on purpose (`.gitignore` → `docs/LEMONSQUEEZY_SELLING.md`).
> This is your business runbook, not public repo docs.

**What you're selling:** prebuilt Nova64 binaries (standalone desktop apps, RetroArch cores, and the
Godot source bundle) as **one product, one price**. The source stays public (MIT) — buyers pay for
the convenience of ready-to-run builds. **Honor system: no DRM, no license keys, no webhook.**

**How delivery works:** Lemon Squeezy (LS) **hosts the download file**. After payment, LS emails the
buyer a download link and shows it on the receipt page. You never run a server. To ship an update you
**replace one file** in the LS dashboard.

**The entire ongoing job, every release:**
```bash
pnpm release:lemon        # builds everything → dist-lemon/nova64-<version>.zip
```
then upload that one zip to LS (Products → Nova64 → replace file → Save). That's it.

---

## Part 1 — One-time setup

Do this once. ~30 minutes.

### 1.1 Build the first bundle

```bash
pnpm release:lemon
```

This produces `dist-lemon/unified_export_build/` (a browsable, buyer-friendly folder) and
`dist-lemon/nova64-<version>.zip` (the file you upload). See **Part 3** for what's inside and the
build toolchain each tier needs. If you don't have all toolchains yet, you can still create the
product now with a partial bundle and re-upload later — or use `--all-cores` to pull cores from your
GitHub Release.

### 1.2 Create the product in Lemon Squeezy

1. Log in at <https://app.lemonsqueezy.com> → make sure a **Store** exists. Note your store
   subdomain: `https://<store>.lemonsqueezy.com`.
2. **Products → + New Product.**
   - **Name:** `Nova64`
   - **Pricing:** **Single payment** (one-time). Set your price.
   - **Description:** short pitch. Mention it includes standalone desktop apps + RetroArch cores +
     the Godot source, and that Nova64 is open source (you're funding development).
3. **Deliver files / Digital download:** turn on file delivery and **upload
   `dist-lemon/nova64-<version>.zip`** as the deliverable. (LS emails this + shows it on the receipt.)
4. *(Optional)* Under the product/store settings, customize the **confirmation modal** and
   **receipt email** copy — a warm thank-you converts repeat buyers.
5. **Publish** the product.

### 1.3 Get your Buy URL

On the published product, click **Share** (or the product's buy link). Copy the URL — it looks like:

```
https://<store>.lemonsqueezy.com/buy/<uuid>
```

### 1.4 Wire the Buy button on the homepage

Already wired in [`index.html`](../index.html) — you only replace the placeholder URL:

1. Find the Buy button in the `#cta` section (search for `YOUR_STORE.lemonsqueezy.com`):
   ```html
   <a href="https://YOUR_STORE.lemonsqueezy.com/buy/YOUR_PRODUCT_ID?embed=1"
      class="btn-hero-primary lemonsqueezy-button">
   ```
2. Replace the `href` with **your Buy URL from 1.3**, and **keep `?embed=1`** on the end and the
   **`lemonsqueezy-button`** class. `?embed=1` opens the checkout as an in-page overlay; the class is
   what lemon.js binds to.
3. The lemon.js loader is already added before `</body>`:
   ```html
   <script src="https://assets.lemonsqueezy.com/lemon.js" defer></script>
   ```
   No other JS needed — it auto-initializes.

> **Later, on the new `indexv2a` design:** its "Buy Nova64" buttons take the exact same treatment —
> set the anchor `href` to your Buy URL with `?embed=1`, add `class="lemonsqueezy-button"`, and
> include the lemon.js `<script>`. Nothing else changes.

### 1.5 Deploy (Vercel)

Ship the homepage the way you already do — this change is **static only** (one script tag + one
link), so your existing build/deploy is unchanged:

```bash
pnpm build          # your existing Vite build — untouched
# commit index.html, push; Vercel deploys as usual
```

### 1.6 Test the whole flow (LS test mode)

1. In LS, toggle **Test mode**.
2. Load your deployed homepage, click **Buy Nova64** → the overlay must open **in-page** (no
   navigation) with the right product + price.
3. Complete a **test order** (LS provides test card numbers).
4. Confirm the **receipt page + email** show the download link and the zip downloads and runs.
5. Toggle **Test mode off** to go live.

---

## Part 2 — Every release (the repeatable part)

This is the whole recurring workflow:

```bash
# 1. Build + package everything into one upload-ready zip
pnpm release:lemon
```
```
# 2. Lemon Squeezy → Products → Nova64 → Files → replace the download
#    with dist-lemon/nova64-<version>.zip → Save.
```
```
# 3. Done. New and existing buyers get the new file from LS.
```

Notes:
- Bump the version in `package.json` when you cut a release so the zip is named
  `nova64-<version>.zip` — keeps your LS uploads self-documenting.
- The Buy button/URL never changes between releases; you only swap the file.
- No code deploy is needed for a binary-only update (only the LS file changes).

### Handy flags

| Command | What it does |
|---|---|
| `pnpm release:lemon` | Build desktop cores locally + **download** Android/RPi/macOS/Apple from the release; then zip. |
| `pnpm release:lemon --all-cores` | Download **every** platform core from the GitHub Release (skip the local build). |
| `pnpm release:lemon --core-tag=latest` | Fetch cores from the newest release (use to grab the first iOS/tvOS build). Also `--core-tag=vX.Y.Z`. |
| `pnpm release:lemon --no-fetch` | Offline: use only locally built cores. |
| `pnpm release:lemon --skip-build` | Re-package existing artifacts only (fast; no compilers run). |
| `pnpm release:lemon --no-desktop` | Skip the standalone `.exe`/Linux export. |
| `pnpm release:lemon --no-godot` / `--no-cores` | Drop that tier from the bundle. |
| `pnpm release:lemon --runner=wsl` | Force builds through WSL (default is auto, WSL-first on Windows). |

Every step is **guarded**: if a toolchain is missing it warns and continues, always producing a zip
from whatever built. So a partial environment still gives you a shippable bundle.

---

## Part 3 — What's in the bundle & the build toolchains

`pnpm release:lemon` assembles [`scripts/package-lemon-release.mjs`](../scripts/package-lemon-release.mjs):

```
dist-lemon/unified_export_build/
  START-HERE.txt            friendly welcome / "pick your path"
  README.txt                detailed per-platform install
  LICENSE   SHA256SUMS.txt
  1-Run-Standalone/         Nova64-Windows.exe, Nova64-Linux.x86_64  (run, no build)
  2-RetroArch-Cores/        {Desktop,Raspberry-Pi,Android,Apple}/ nova64_libretro_*
  3-Godot-Source/           libnova64.* GDExtension libs + full godot_project/
dist-lemon/nova64-<version>.zip   ← the single file uploaded to Lemon Squeezy
```

| Tier | Built by | Toolchain (WSL) |
|---|---|---|
| **1 · Standalone desktop** | [`scripts/export-desktop.sh`](../scripts/export-desktop.sh) → Godot headless export | Godot 4.5 editor + **export templates** (see below) + the GDExtension libs from tier 3 |
| **2 · RetroArch cores** | desktop: `make -C retroarch` (host) + `platform=win-cross`; Android/RPi/macOS/Apple: **downloaded** from the GitHub Release (no local cross-toolchains) | `build-essential`, `gcc-mingw-w64-x86-64`, zlib |
| **3 · Godot source** | `nova64-godot/scripts/build-all.sh linux windows` | SCons + `use_mingw=yes` (per `GODOT.md`) |

**Getting ALL RetroArch cores (desktop + Android + Apple).** Local `make` only builds
your host + a Windows cross-DLL. Every platform is built in CI
(`.github/workflows/release-cores.yml`): Linux x86_64/aarch64/armhf, Windows, macOS universal,
Android arm64-v8a/armeabi-v7a/x86_64, **iOS/iPadOS (arm64)** and **Apple TV/tvOS (arm64)**. Cut a
release (`git tag vX.Y.Z && git push --tags`, or run the workflow from the Actions tab), then:

```bash
pnpm release:lemon --all-cores      # downloads every core from the latest Release
```

The bundle sorts them into `2-RetroArch-Cores/{Desktop,Android,Apple}/`. iPhone and iPad share the
`ios_arm64` core. (iOS/tvOS cores are for sideloaded RetroArch via AltStore/Xcode.)

Nothing here touches your existing `pnpm build` (Vite) or the CI release workflows — it's all
additive tooling for the paid bundle.

---

## Part 4 — Standalone desktop exports (.exe / .app) — plan & status

Goal: buyers get a **double-click app, no build required**. Windows + Linux are wired now; macOS is a
planned stretch.

### Status
- ✅ **Windows `.exe`** and ✅ **Linux `x86_64`** — export presets added to
  `nova64-godot/godot_project/export_presets.cfg` (`Windows Desktop`, `Linux/X11`), exported by
  `scripts/export-desktop.sh`, collected into `1-Run-Standalone/`.
- ⏳ **macOS `.app`** — not shipped. Cross-exporting a signed `.app` from a non-Mac host is a separate
  effort (below). Until then, macOS buyers use the RetroArch core or the Godot source.

### One-time desktop-export setup  ("how do I do step 2")
1. Install **Godot 4.5** (this repo expects `C:\Program Files\godot45\`; a Linux Godot 4.5 binary on
   `PATH` as `godot4`/`godot` also works).
2. Install matching **export templates** (headless export needs them) — one command:
   ```bash
   GODOT_VERSION=4.5 bash nova64-godot/scripts/install-godot-templates.sh
   ```
3. Ensure the GDExtension libs exist (tier 3 build runs first in `pnpm release:lemon`, or run
   `cd nova64-godot && ./scripts/build-all.sh linux windows`).
4. `pnpm release:lemon` now includes the desktop apps automatically. To export them alone:
   ```bash
   bash scripts/export-desktop.sh
   ```

> **Yes — from Linux/WSL you get BOTH the Windows `.exe` and the Linux binary in one run.** Godot's
> export templates are prebuilt for every target, so the *host* OS doesn't matter — `export-desktop.sh`
> exports the `Windows Desktop` and `Linux/X11` presets back-to-back regardless of where it runs. The
> only per-target requirement is that the matching GDExtension lib exists (`build-all.sh linux windows`
> builds both, which `pnpm release:lemon` does for you). macOS `.app` is the exception — it needs a Mac
> to export/sign.

### macOS `.app` — the plan (do later)
- **Easiest:** run Godot's macOS export **on a Mac** (or a macOS CI runner — you already use
  `macos-latest` in `.github/workflows/release-cores.yml`). Add a `macOS` preset + a CI job that runs
  `godot --headless --export-release "macOS" Nova64.app`, then drop the `.app`/`.zip` into
  `1-Run-Standalone/`.
- **Signing/notarization:** unsigned `.app`s trigger Gatekeeper. For a smooth buyer experience you'd
  need an Apple Developer ID + `codesign` + `notarytool`. That's the "stretch" — ship Windows/Linux
  first, add notarized macOS when there's demand.

---

## Part 5 — Optional future upgrades (NOT built — intentionally)

Kept out to stay "stupid easy." Add only if you outgrow the honor system:
- **Webhook + records:** listen for LS `order_created` to log sales / analytics (LS → Settings →
  Webhooks). Not needed for delivery.
- **License keys:** enable LS license keys + a `/download` page that validates them — lets you
  self-update downloads without re-uploading. Pull-based (still no webhook).
- **Account-gated downloads:** tie entitlements to Supabase auth (already wired in `src/main.js`) for
  a logged-in "my downloads" page. Best once the app/accounts exist.

---

## Quick reference

| Thing | Where |
|---|---|
| Build + package one zip | `pnpm release:lemon` |
| Upload target | LS → Products → **Nova64** → Files → replace → Save |
| Buy button to edit | `index.html` `#cta` section (search `YOUR_STORE.lemonsqueezy.com`) |
| lemon.js loader | already in `index.html` before `</body>` |
| Packager | `scripts/package-lemon-release.mjs` |
| Desktop export | `scripts/export-desktop.sh` + presets in `export_presets.cfg` |
| Output | `dist-lemon/` (gitignored) |
