# Godot Playtest and Trailer Workflow

Nova64 includes two repository-backed skills for native Godot media work:

- `godot-game-tester` launches, plays, tests, and records a Godot project or exported build.
- `godot-trailer-maker` turns retained gameplay recordings into reproducible demo reels and trailers.

The canonical skill sources live under `.alpha-loop/templates/skills/`. The matching `.claude/skills/` directories are generated harness copies; update the templates first and run `alpha-loop sync` when Alpha Loop is installed. A personal Codex installation can copy either canonical skill directory to `%USERPROFILE%\.codex\skills\`.

This workflow is for recording and editing gameplay. For video playback inside a Nova64 cart, see [Nova64 Video Guide](VIDEO_GUIDE.md).

## Requirements

- A native Windows Godot project or exported build.
- An interactive, unlocked desktop for visible playtesting and capture.
- FFmpeg and ffprobe on `PATH` or installed through WinGet.
- Known controls and a short route with observable checkpoints.

Put raw takes, manifests, contact sheets, and finished MP4 files under `tmp/videos/`. The directory and MP4 files are ignored by Git, so large generated media stays out of commits by default.

## Play and record

1. Inspect `project.godot`, launch scripts, input actions, and visible control hints.
2. Choose the target: editor-run project, debug build, or shipped export. Prefer the shipped export for release validation.
3. Launch it, wait for the real game window, and visually confirm the initial frame before sending input.
4. Create a small JSON scenario. The playback helper verifies that the target process owns the foreground window before each input action.
5. Record a deliberate pass, inspect frames from the beginning, middle, and end, and fully decode-check the result.

Example `tmp/videos/playthrough.json`:

```json
[
  { "action": "tap", "key": "F3", "after_ms": 300 },
  { "action": "tap", "key": "SPACE", "after_ms": 1000 },
  { "action": "hold", "keys": ["W", "A"], "duration_ms": 1200 }
]
```

Run the guarded playback after launching the game:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .alpha-loop/templates/skills/godot-game-tester/scripts/windows_playback.ps1 `
  -ProcessName Nova64Godot `
  -ScenarioPath tmp/videos/playthrough.json
```

Capture either the foreground game window by title or a known desktop crop:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .alpha-loop/templates/skills/godot-game-tester/scripts/windows_capture.ps1 `
  -OutputPath tmp/videos/raw/demo-take-01.mp4 `
  -WindowTitle "Nova64 Godot" `
  -DurationSeconds 20
```

Verify that the result contains a video stream and decodes from beginning to end:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .alpha-loop/templates/skills/godot-game-tester/scripts/verify_video.ps1 `
  -Path tmp/videos/raw/demo-take-01.mp4
```

A successful Godot export does not prove that every resource reached the PCK. In particular, WSL-created symlinks can be omitted from a Windows export. Confirm that the exported game exposes the expected carts and content before treating the build as promotion-ready.

## Build a trailer

Keep source takes unchanged. Select clean, active moments and describe the edit in a JSON manifest following [the trailer manifest reference](../.alpha-loop/templates/skills/godot-trailer-maker/references/trailer-manifest.md). Labels and title cards must describe features actually shown in the footage.

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .alpha-loop/templates/skills/godot-trailer-maker/scripts/make_trailer.ps1 `
  -ManifestPath tmp/videos/trailer.json

powershell -NoProfile -ExecutionPolicy Bypass -File .alpha-loop/templates/skills/godot-trailer-maker/scripts/verify_trailer.ps1 `
  -Path tmp/videos/trailer.mp4
```

The verification step fully decodes the trailer and creates a beginning/middle/end contact sheet beside it. Inspect that sheet for unrelated applications, system UI, debug overlays, unreadable labels, blank frames, and poor crops.

Music is optional and must be supplied by the user or come from an explicitly authorized source. Record its source and license in the handoff. The helper adds authorized music as AAC but does not mix original gameplay audio; without `music_path`, the trailer is intentionally silent.

## Delivery checklist

- Finished MP4, manifest, contact sheet, and retained raw-footage folder are under `tmp/videos/`.
- Resolution, duration, codec, frame rate, and audio state match the intended destination.
- The complete file decodes without errors.
- Every title, label, platform claim, and feature claim is factual.
- No loading screens, desktop chrome, search panels, debug popups, or failed takes remain in a promotional cut.
- The handoff states whether the footage came from the project runtime or a shipped export and notes any untested hardware or silent audio.
