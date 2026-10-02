# Release Notes

Per-tag release notes for Nova64, one file per git tag. These are written to be
pasted directly into a GitHub Release (Releases → Draft a new release → pick the
tag → paste the matching file body).

`CHANGELOG.md` at the repo root is the rolling human-readable summary; the files
here are the tag-scoped, publish-ready versions.

| Tag | Date | Theme |
| --- | --- | --- |
| [v0.5.3](v0.5.3.md) | 2026-07-06 | Metaverse + Lemon Squeezy release pipeline |
| [v0.5.2](v0.5.2.md) | 2026-06-02 | _Hippie Sunshine_ — RetroArch core parity + cross-platform cores |
| [v0.5.1](v0.5.1.md) | 2026-05-10 | Godot voxel/WAD parity push |
| [v0.5.0](v0.5.0.md) | 2026-04-29 | _The Great Namespace Push_ |
| [v0.4.9](v0.4.9.md) | 2026-04-29 | Godot native host merged to trunk + Babylon parity |
| [v0.2.1](v0.2.1.md) | 2026-03-19 | Lint/format hardening |
| [v0.2.0](v0.2.0.md) | 2026-03-19 | Three.js rendering pipeline |
| [v0.1.0](v0.1.0.md) | 2026-03-19 | First public release — 2D core + WebGL2 |

To regenerate the commit list for a tag range:

```bash
git log --no-merges --format='- %s' <prev-tag>..<tag>
```
