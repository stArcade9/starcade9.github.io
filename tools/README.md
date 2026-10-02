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
