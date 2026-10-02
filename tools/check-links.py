#!/usr/bin/env python3
"""Check static HTML routes, configured aliases, and internal links over HTTP.

Usage: python3 tools/check-links.py [http://localhost:8080]
External sites and client-side template expressions are outside this check.
"""

from concurrent.futures import ThreadPoolExecutor
from html.parser import HTMLParser
import json
from pathlib import Path
import sys
from urllib.error import HTTPError, URLError
from urllib.parse import urldefrag, urljoin, urlsplit
from urllib.request import urlopen

ROOT = Path(__file__).resolve().parent.parent


class Links(HTMLParser):
    def __init__(self):
        super().__init__()
        self.hrefs = []

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == "a" and attrs.get("href"):
            self.hrefs.append(attrs["href"])


def main():
    base = (sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8080").rstrip("/")
    origin = urlsplit(base).netloc
    pages = [p for p in ROOT.rglob("*.html") if not
             {"node_modules", ".git", ".next", "stories"}.intersection(p.relative_to(ROOT).parts)]
    sources = {}

    def add(url, source):
        url = urldefrag(url)[0]
        parsed = urlsplit(url)
        if parsed.scheme in ("http", "https") and parsed.netloc == origin:
            sources.setdefault(url, set()).add(source)

    for page in pages:
        relative = page.relative_to(ROOT).as_posix()
        url = base + "/" + relative
        add(url, relative)
        add(url[:-5], relative)
        # Directory index pages are also reached without /index.html.
        canonical = url[:-len("index.html")].rstrip("/") if page.name == "index.html" else url[:-5]
        add(canonical, relative)
        parser = Links()
        parser.feed(page.read_text())
        for href in parser.hrefs:
            if "{{" not in href:
                add(urljoin(canonical, href), relative)

    config = json.loads((ROOT / "vercel.json").read_text())
    for rule in config.get("rewrites", []):
        add(base + rule["source"], "vercel.json")

    def check(url):
        try:
            with urlopen(url, timeout=15) as response:
                links = []
                if response.headers.get_content_type() == "text/html":
                    parser = Links()
                    parser.feed(response.read().decode("utf-8"))
                    links = [urljoin(response.url, href) for href in parser.hrefs if "{{" not in href]
                return url, response.status, links
        except HTTPError as error:
            error.close()
            return url, error.code, []
        except (URLError, TimeoutError) as error:
            return url, str(error), []

    checked = set()
    failures = []
    with ThreadPoolExecutor(max_workers=8) as pool:
        while pending := sorted(set(sources) - checked):
            for url, status, links in pool.map(check, pending):
                checked.add(url)
                if status != 200:
                    failures.append((url, status))
                for link in links:
                    add(link, url)
    for url, status in failures:
        print(f"FAIL {status}: {url}\n  Linked by: {', '.join(sorted(sources[url]))}")
    print(f"Checked {len(pages)} HTML pages and {len(sources)} unique local URLs: {len(failures)} failures.")
    return bool(failures)


if __name__ == "__main__":
    sys.exit(main())
