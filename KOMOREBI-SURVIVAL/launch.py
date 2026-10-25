import functools
import http.server
import pathlib
import urllib.request
import webbrowser


ROOT = pathlib.Path(__file__).resolve().parent / "dist"
PORT = 4197
URL = f"http://127.0.0.1:{PORT}/"


class GameHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-cache")
        super().end_headers()


def main():
    handler = functools.partial(GameHandler, directory=str(ROOT))
    try:
        server = http.server.ThreadingHTTPServer(("127.0.0.1", PORT), handler)
    except OSError:
        try:
            with urllib.request.urlopen(URL, timeout=2) as response:
                if "KOMOREBI SURVIVAL" in response.read().decode("utf-8"):
                    webbrowser.open(URL)
                    return
        except (OSError, UnicodeError):
            pass
        print(f"ポート{PORT}が使用中です。他のゲーム起動画面を閉じて、もう一度起動してください。")
        raise SystemExit(1)
    print("KOMOREBI SURVIVAL — 五つの封石を起動しました。")
    print(f"ブラウザで {URL} を開きます。")
    print("この画面を閉じるか Control+C を押すとゲームを終了します。")
    webbrowser.open(URL)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
