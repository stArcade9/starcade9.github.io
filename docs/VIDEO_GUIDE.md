# Nova64 Video Guide

Nova64 plays fullscreen video and in-world video textures from a **single cart
API** — `nova64.video` — across all three backends. You write one
`playFullscreen` call; each host decodes the format it understands.

Worked example: [`examples/story-video-demo`](../examples/story-video-demo/code.js)
— a slide story that ends with a fullscreen video outro, running on web, Godot,
and RetroArch from the same `code.js`. There is also a smaller video texture demo
in [`examples/hello-helpers`](../examples/hello-helpers/code.js).

## How it works per backend

| Backend | Mechanism | Container | Notes |
|---|---|---|---|
| **Web** | HTML5 `<video>` overlay + THREE/BABYLON `VideoTexture` | `.mp4` (H.264/AAC) | Full seeking, audio, in-world textures. |
| **Godot** | native `VideoStreamPlayer` on a `CanvasLayer` | `.ogv` (Theora/Vorbis) | The only format Godot decodes natively. |
| **RetroArch** | [`pl_mpeg`](../retroarch/pl_mpeg.h) decoder **in-core** | `.mpg` (MPEG1/MP2) | The libretro core has no other codec. Decoded frames blit into the 2D framebuffer (shown directly in software mode, composited over the 3D scene in GLES). |

Because the three hosts need three containers, a cart ships a `.mpg` and/or
`.ogv` alongside its web `.mp4` and passes all of them to one call — see
[Authoring a cart](#authoring-a-cart). Generate them with one command using the
[transcode tool](#the-transcode-tool).

> **Audio:** MPEG1 audio (MP2 at 44.1 kHz) is mixed by the RetroArch core. If a
> source video has **no audio track**, every backend plays it silent — that is a
> property of the source, not the player. Use a clip that actually has audio.

## Authoring a cart

```js
function playOutro() {
  nova64.video
    .playFullscreen('/assets/sample.mp4', {
      nativeUrl: 'assets/video/sample.ogv', // Godot: native Theora
      mpgUrl: 'assets/video/sample.mpg',    // RetroArch: MPEG1 via pl_mpeg
      muted: false,
      onFinish: () => setScreen('done'),
    })
    .then(result => {
      if (result && result.error) setScreen('video-error'); // show a fallback!
    });
}

// REQUIRED: the engine does not auto-drive helper ticks. Pump them yourself.
export function update(dt) {
  if (screen === 'video' && nova64.video._tick) nova64.video._tick(dt);
}
export function draw() {
  // Native hosts paint the frame from draw() via _draw(); web paints its own overlay.
  if (screen === 'video' && nova64.video._draw && nova64.video._draw()) return;
  // ...your fallback / other screens...
}
```

Three things that bite people, all shown in
[`examples/story-video-demo/code.js`](../examples/story-video-demo/code.js):

1. **Drive the ticks.** Call `nova64.video._tick(dt)` in `update()` and
   `nova64.video._draw()` in `draw()`. The engine does not call them for you, so
   without this the video never advances or paints on native hosts. (`nova64.story`
   has the same contract.)
2. **Always render a failure fallback.** When `playFullscreen` resolves with
   `{ error: true }` (missing codec, missing/corrupt asset, no host support),
   show a message instead of a blank screen — see `drawVideoError()`.
3. **Bundle the `.mpg` in the cart manifest** so it lands in the `.nova`
   package. Web `.mp4`s are served from `public/`, not packaged.

### Manifest + packaging (RetroArch)

Add the `.mpg` to the cart's `manifest.json`:

```json
{ "assets": ["assets/story/title.png", "assets/video/sample.mpg"] }
```

Then repackage so the `.nova` picks it up:

```sh
python3 retroarch/tools/package_example_cart.py <cart> --out-dir retroarch/games
```

## The transcode tool

[`scripts/transcode-video.py`](../scripts/transcode-video.py) turns one source
video into the per-backend assets, sized to the 640×360 framebuffer:

```sh
# .mpg (RetroArch) + .ogv (Godot), plus .mp4 (web) with --mp4
python3 scripts/transcode-video.py input.mp4 examples/mycart/assets/video --mp4

# clip a 12s segment starting at 0:33
python3 scripts/transcode-video.py movie.mp4 out/ --start 33 --duration 12
```

It prints the exact `playFullscreen` snippet to paste in, warns when the source
has no audio track, and accepts `--name`, `--size`, `--fps`, `--no-ogv`,
`--no-mpg`. `ffmpeg` is required (override with the `FFMPEG` env var to point at
a static build). The `.mpg` is MPEG1/MP2 at 44.1 kHz to match the core's mixer.

## API reference

`nova64.video.playFullscreen(url, opts)` → `Promise`
- `url` — web `.mp4` URL (first positional arg, also the web source).
- `opts.nativeUrl` — Godot `.ogv` path. `opts.mpgUrl` — RetroArch `.mpg` path.
- `opts.muted`, `opts.loop`, `opts.onFinish(info)`, `opts.skipKey` (web).
- Resolves on end/skip with `{ played, skipped }`, or `{ error, message }` on
  failure. Skips on Escape/Enter/Space (or button 0 on native).

`nova64.video.loadTexture(url, opts)` → **in-world video texture** (a "TV"). The
handle exposes `.applyToMesh(meshId)` (binds the video as the mesh's texture),
`.update(dt)`, `.isReady()`, and `.dispose()`.
- **Web** wires a THREE/BABYLON `VideoTexture` that refreshes itself.
- **RetroArch** decodes MPEG1 to a GLES texture and re-uploads it each frame —
  call `.update(dt)` in your `update()` to advance it.
- **Godot** plays an offscreen `VideoStreamPlayer` and binds its live
  `get_video_texture()` onto the mesh material (decodes on its own; `.update()`
  is a no-op).

Working example: [`examples/tv-demo`](../examples/tv-demo/code.js) — a 3D
television with the video playing on its screen mesh.

```js
const tv = nova64.video.loadTexture('/assets/clip.mp4', { mpgUrl: 'assets/video/clip.mpg' });
tv.applyToMesh(screenMeshId);
// update(dt): if (tv.update) tv.update(dt);   // no-op on web, decodes on native
```

`nova64.video._tick(dt)` / `._draw()` — per-frame pump/paint for **fullscreen**
video on native hosts (call from `update`/`draw`).

The companion [`nova64.story`](api-improvements.md) helper (slide intros) follows
the identical `_tick`/`_draw` contract and is used together with video in the
story-video-demo.

## Troubleshooting

- **Silent video** → the source has no audio track. Re-transcode from a clip
  that has one; the core mixes MP2 audio when present.
- **Black screen on RetroArch** → no `mpgUrl`, or the `.mpg` isn't in the
  manifest/`.nova`. Confirm with `python3 -c "import zipfile; print(zipfile.ZipFile('retroarch/games/<cart>.nova').namelist())"`.
- **`video_open_failed` / `video_asset_not_found`** → the `.mpg` path doesn't
  resolve inside the package; check the manifest path matches `mpgUrl`.
- **Plays too fast / ends early** → make sure you re-encoded with the tool (it
  sets a constant frame rate); a variable-rate `.mpg` confuses the pacing.

## Internals

The RetroArch decoder lives in
[`retroarch/nova64_libretro.c`](../retroarch/nova64_libretro.c) (search
`__novaVideoOpen`) using the vendored single-header
[`retroarch/pl_mpeg.h`](../retroarch/pl_mpeg.h). The Godot path is in the
gdextension bridge (`video.playFullscreen/stop/poll`); see
[`docs/GODOT_HOST_CONTRACT.md`](GODOT_HOST_CONTRACT.md). The web path is
[`runtime/api-video.js`](../runtime/api-video.js).
