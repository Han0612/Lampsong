#!/usr/bin/env python3
"""Serve the bundled prototype on this computer only; no dependencies."""
import functools
import http.server
from pathlib import Path
import sys
import threading
import webbrowser

root = Path(__file__).resolve().parents[1] / 'dist'
handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=str(root))
try:
    server = http.server.ThreadingHTTPServer(('127.0.0.1', 8840), handler)
except OSError:
    server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), handler)
url = 'http://127.0.0.1:%s/' % server.server_port
print('灯下词 · CATLIGHT06 v148\n' + url + '\n关闭本窗口或按 Ctrl+C 停止。', flush=True)
if '--no-browser' not in sys.argv:
    threading.Timer(.4, lambda: webbrowser.open(url)).start()
try:
    server.serve_forever()
except KeyboardInterrupt:
    pass
finally:
    server.server_close()
