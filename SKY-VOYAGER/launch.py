#!/usr/bin/env python3
"""Run the bundled game on this Mac; Python's standard library is sufficient."""
import argparse
import functools
import http.server
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import time
import urllib.error
import urllib.request
import webbrowser

ROOT = Path(__file__).resolve().parent
IDENTITY = "sky-voyager-local-v1"
HEALTH_PATH = "/__sky_voyager_local_health__"


def healthy(port):
    try:
        with urllib.request.urlopen(
            f"http://127.0.0.1:{port}{HEALTH_PATH}", timeout=0.4
        ) as response:
            return json.load(response).get("game") == IDENTITY
    except (OSError, ValueError, urllib.error.URLError):
        return False


class Handler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path == HEALTH_PATH:
            body = json.dumps({"game": IDENTITY}).encode()
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        super().do_GET()

    def end_headers(self):
        self.send_header("Cache-Control", "no-cache")
        super().end_headers()


def serve(port):
    factory = functools.partial(Handler, directory=str(ROOT / "dist"))
    server = http.server.ThreadingHTTPServer(("127.0.0.1", port), factory)
    server.daemon_threads = True
    server.serve_forever()


def launch(no_open=False):
    if not (ROOT / "dist" / "index.html").is_file():
        raise RuntimeError("ゲームのファイルが見つかりません。フォルダ一式を元に戻してください。")
    cache = Path(tempfile.gettempdir()) / "sky-voyager-local"
    cache.mkdir(mode=0o700, parents=True, exist_ok=True)
    for port in range(4477, 4488):
        if healthy(port):
            break
        with (cache / f"server-{port}.log").open("ab") as log:
            process = subprocess.Popen(
                [sys.executable, str(Path(__file__).resolve()), "--serve", "--port", str(port)],
                cwd=str(ROOT), stdin=subprocess.DEVNULL, stdout=log, stderr=log,
                start_new_session=True,
            )
        for _ in range(30):
            if healthy(port):
                break
            if process.poll() is not None:
                break
            time.sleep(0.1)
        if healthy(port):
            break
        if process.poll() is None:
            process.terminate()
    else:
        raise RuntimeError("ゲームを起動できませんでした。少し待ってからもう一度開いてください。")
    url = f"http://127.0.0.1:{port}/"
    print(url, flush=True)
    if not no_open:
        webbrowser.open(url)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--serve", action="store_true")
    parser.add_argument("--port", type=int, default=4477)
    parser.add_argument("--no-open", action="store_true")
    args = parser.parse_args()
    try:
        if args.serve:
            serve(args.port)
        else:
            launch(args.no_open)
    except KeyboardInterrupt:
        pass
    except Exception as error:
        print(f"起動できませんでした: {error}", file=sys.stderr)
        sys.exit(1)
