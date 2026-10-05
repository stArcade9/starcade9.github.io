#!/usr/bin/env python3
"""Render selected docs/*.md into the site's existing styled HTML wrappers.
Requires Python-Markdown: python -m pip install markdown
Usage: python tools/render-docs.py docs/CHEATSHEET.md [...]
"""
from pathlib import Path
from urllib.parse import urlsplit, urlunsplit
import html
import re
import sys
import posixpath
import markdown

ROOT = Path(__file__).resolve().parent.parent
TEMPLATE = ROOT / 'docs/CHEATSHEET.html'

def render(source):
    source = source.resolve()
    target = source.with_suffix('.html')
    wrapper = (target if target.exists() else TEMPLATE).read_text()
    text = source.read_text()
    title = re.search(r'^# (.+)$', text, re.M)
    title = title.group(1) if title else source.stem
    text = re.sub(r'^# .+\n', '', text, count=1)
    body = markdown.markdown(text, extensions=['fenced_code', 'tables', 'toc', 'sane_lists'])
    def link(match):
        value = html.unescape(match.group(2))
        url = urlsplit(value)
        if url.scheme or url.netloc or not url.path:
            return match.group(0)
        absolute = posixpath.normpath(posixpath.join('/' + str(source.parent.relative_to(ROOT)), url.path))
        local = ROOT / absolute.lstrip('/')
        if local.suffix == '.md' and local.with_suffix('.html').exists():
            absolute = absolute[:-3]
        elif local.suffix == '.md' and local.is_relative_to(ROOT / 'docs') and local.exists():
            absolute = absolute[:-3]  # other docs generated in this batch
        elif not local.exists() and not local.with_suffix('.html').exists():
            absolute = 'https://github.com/seacloud9/nova64/blob/v0.5.6/' + absolute.lstrip('/')
        return match.group(1) + html.escape(urlunsplit(('', '', absolute, url.query, url.fragment)), quote=True) + match.group(3)
    body = re.sub(r'(href=")([^"]+)(")', link, body)
    sections = re.split(r'(?=<h2\b)', body)
    rendered = '\n'.join('        <section class="md">\n' + section + '\n        </section>\n' for section in sections if section.strip())
    start = wrapper.index('        <section class="md">')
    end = wrapper.index('        <footer>', start)
    wrapper = wrapper[:start] + rendered + '\n' + wrapper[end:]
    wrapper = re.sub(r'<title>.*?</title>', '<title>' + html.escape(title) + ' - Nova64 Documentation</title>', wrapper, count=1)
    wrapper = re.sub(r'<h1>.*?</h1>', '<h1>' + html.escape(title) + '</h1>', wrapper, count=1)
    target.write_text(wrapper)
    print(target.relative_to(ROOT))

if __name__ == '__main__':
    for name in sys.argv[1:]:
        render(Path(name))
