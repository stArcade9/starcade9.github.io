# Local preview

Run `./start-server.sh` from the repository root, then open
<http://localhost:8080>. Pass a port to change it: `./start-server.sh 8081`.

The Python standard-library server reads `cleanUrls`, `trailingSlash: false`,
and the exact static rewrites in the root `vercel.json`. This lets URLs such as
`/docs/GODOT_HOST_CONTRACT` and `/api` work locally. Existing `.html` URLs
redirect to their clean URLs, preserving query strings. Missing files return
404; directories without an index are not listed. The server binds to localhost
by default. It does not emulate Vercel functions or dynamic rewrite patterns.

With the server running, check static page links:

```sh
python3 tools/check-links.py
# Or check a different local port:
python3 tools/check-links.py http://localhost:8081
# Run routing regression tests (starts its own temporary server):
python3 -B -m unittest discover -s tools -p 'test_*.py'
```

The checker requests every static HTML page (both `.html` and extensionless),
directory indexes, and configured aliases, then follows internal HTML links
using the final response URL. It exits nonzero on HTTP failures. It excludes
the separate `stories` Next.js application, external websites, URL fragments,
and client-side template expressions; it does not execute JavaScript or test
gameplay.

## Vendored Nova64 engine

This site integrates Nova64 **0.5.6**, from `seacloud9/nova64` tag `v0.5.6`
(commit `80a185f425c26c4e81ae11a137f5b2b97a154f6f`). The release's `runtime/`,
`src/main.js`, and WAD demo are used here. Website-specific cart changes,
including the campaign video and destination links, are preserved.

Local integration patches retain lazy Babylon/Supabase imports and the guarded
metadata glob for raw-source pages. `runtime/console.js` reports `0.5.6` rather
than the upstream tag's stale `0.4.9` constant.

To rebuild the runtime bundle after editing source, supply a Nova64 checkout
with its dependencies installed:

```sh
node tools/build-runtime.mjs /path/to/nova64
node tools/check-raw-source.mjs
```

The build runs in a temporary directory and updates the bundle references in
`console.html`, `cart-runner.html`, and `hero-embed.html`. It does not change the
source checkout. Homepage demos and the standalone player load `src/main.js`
directly; both paths must be checked after upgrades.

Docs and carts were compared with the Nova64 checkout on October 4, 2026.
Upstream Markdown documentation is mirrored in `docs/`; matching HTML pages
are rendered with the site's existing styles and analytics. `VIDEO_GUIDE`
retains this site's demo-reel filenames. Campaign/video carts retain their
custom assets and destination links.

The upstream FPS cart still contained `prinprintCentered`, leaving its HUD's
`print()` calls bound to the browser Print command. Local cart corrections
explicitly bind drawing text functions and send diagnostic-cart logs to
`console.log`. These are intentional differences from upstream. Check every
cart for the same regression with:

```sh
node tools/check-cart-text.mjs /path/to/nova64
```

After updating Markdown, regenerate selected documentation pages using
Python-Markdown (`python -m pip install markdown`):

```sh
python tools/render-docs.py docs/CHEATSHEET.md docs/NOVA64_API_REFERENCE.md
```
