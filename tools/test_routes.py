"""Routing regressions: python3 -m unittest discover -s tools -p 'test_*.py'."""

from http.server import ThreadingHTTPServer
from threading import Thread
import unittest
from urllib.error import HTTPError
from urllib.request import urlopen

from serve import ROOT, REWRITES, SiteHandler


class QuietHandler(SiteHandler):
    def log_message(self, *args):
        pass


class RouteTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server = ThreadingHTTPServer(("127.0.0.1", 0), QuietHandler)
        cls.thread = Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()
        cls.base = f"http://127.0.0.1:{cls.server.server_port}"

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()
        cls.thread.join()

    def test_clean_html_and_trailing_slash(self):
        expected = (ROOT / "docs/GODOT_HOST_CONTRACT.html").read_bytes()
        for suffix in ("", ".html", "/"):
            with self.subTest(suffix=suffix):
                with urlopen(self.base + "/docs/GODOT_HOST_CONTRACT" + suffix + "?review=1") as response:
                    self.assertEqual(response.status, 200)
                    self.assertEqual(response.read(), expected)
                    self.assertEqual(response.headers.get_content_type(), "text/html")
                    self.assertEqual(response.url, self.base + "/docs/GODOT_HOST_CONTRACT?review=1")

    def test_aliases_serve_correct_document(self):
        for source, destination in REWRITES.items():
            with self.subTest(source=source):
                with urlopen(self.base + source) as response:
                    self.assertEqual(response.read(), (ROOT / (destination.lstrip("/") + ".html")).read_bytes())

    def test_docs_index(self):
        for route in ("/docs", "/docs/", "/docs/index.html"):
            with self.subTest(route=route):
                with urlopen(self.base + route) as response:
                    self.assertEqual(response.read(), (ROOT / "docs/index.html").read_bytes())

    def test_assets_are_not_rewritten(self):
        route = "/assets/cart-thumbs/f-zero-nova-3d.png"
        with urlopen(self.base + route) as response:
            self.assertEqual(response.read(), (ROOT / route.lstrip("/")).read_bytes())
            self.assertEqual(response.headers.get_content_type(), "image/png")

    def test_missing_pages_and_bare_directories_are_404(self):
        for route in ("/docs/no-such-page", "/docs/no-such-page.html", "/runtime", "/runtime/"):
            with self.subTest(route=route):
                with self.assertRaises(HTTPError) as error:
                    urlopen(self.base + route)
                self.assertEqual(error.exception.code, 404)
                error.exception.close()
