#!/usr/bin/env python3
"""Offline, loopback-only preview. No directory listings, dotfiles or symlink escapes."""
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from urllib.parse import urlsplit, unquote
import sys
ROOT = (Path.cwd() / 'artifacts').resolve(strict=True)
class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs): super().__init__(*args, directory=str(ROOT), **kwargs)
    def permitted(self):
        if self.headers.get('Host') not in (f'127.0.0.1:{self.server.server_port}', f'localhost:{self.server.server_port}'):
            return False
        raw=unquote(urlsplit(self.path).path)
        if any(p.startswith('.') for p in raw.split('/') if p): return False
        try:
            target=(ROOT / raw.lstrip('/')).resolve(strict=True)
            return target.is_relative_to(ROOT) and target.is_file()
        except (OSError,ValueError): return False
    def do_GET(self):
        if not self.permitted(): self.send_error(403); return
        super().do_GET()
    def do_HEAD(self):
        if not self.permitted(): self.send_error(403); return
        super().do_HEAD()
    def end_headers(self):
        self.send_header('Content-Security-Policy', "default-src 'none'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; media-src 'self' blob:; connect-src 'self'; frame-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; sandbox allow-scripts")
        self.send_header('X-Content-Type-Options','nosniff')
        self.send_header('Referrer-Policy','no-referrer')
        self.send_header('Cache-Control','no-store')
        super().end_headers()
if __name__=='__main__':
    ThreadingHTTPServer(('127.0.0.1',int(sys.argv[1]) if len(sys.argv)>1 else 4567),Handler).serve_forever()
