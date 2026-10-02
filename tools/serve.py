#!/usr/bin/env python3
"""Preview this static site with its clean URLs and exact Vercel rewrites.

This is a local static preview, not a general Vercel emulator.
"""

import argparse
import json
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlsplit, urlunsplit

ROOT = Path(__file__).resolve().parent.parent
CONFIG = json.loads((ROOT / "vercel.json").read_text())
REWRITES = {rule["source"]: rule["destination"] for rule in CONFIG.get("rewrites", [])}


class SiteHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def translate_path(self, path):
        route = unquote(urlsplit(path).path)
        destination = REWRITES.get(route, route)
        target = Path(super().translate_path(destination))
        if CONFIG.get("cleanUrls") and not target.is_file():
            html = Path(str(target) + ".html")
            if html.is_file():
                return str(html)
        if target.is_dir() and (target / "index.html").is_file():
            return str(target / "index.html")
        return str(target)

    def send_head(self):
        url = urlsplit(self.path)
        route = url.path
        # Avoid SimpleHTTPRequestHandler's automatic slash redirect for bare
        # directories, which would conflict with trailingSlash: false.
        if Path(self.translate_path(route)).is_dir():
            self.send_error(404, "No page at this URL")
            return None
        canonical = route
        if CONFIG.get("trailingSlash") is False and route != "/":
            canonical = canonical.rstrip("/")
        if CONFIG.get("cleanUrls") and canonical.endswith(".html"):
            if Path(self.translate_path(canonical)).is_file():
                canonical = canonical[:-5]
        if canonical != route:
            self.send_response(308)
            self.send_header("Location", urlunsplit(("", "", canonical, url.query, "")))
            self.send_header("Content-Length", "0")
            self.end_headers()
            return None
        return super().send_head()

    def list_directory(self, path):
        self.send_error(404, "No page at this URL")
        return None


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("port", nargs="?", type=int, default=8080)
    parser.add_argument("--bind", default="127.0.0.1")
    args = parser.parse_args()
    server = ThreadingHTTPServer((args.bind, args.port), SiteHandler)
    print(f"Serving {ROOT} at http://{args.bind}:{args.port}", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
