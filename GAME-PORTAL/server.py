#!/usr/bin/env python3
"""Local-only game portal. No dependencies, installs, or external services."""
import argparse
import functools
import hashlib
import http.server
import json
from pathlib import Path
import secrets
import subprocess
import sys
import tempfile
import threading
import time
import urllib.error
import urllib.parse
import urllib.request

from catalog import discover, godot_binary

HERE = Path(__file__).resolve().parent
IDENTITY = 'macky-game-portal-v1'
DEFAULT_PORT = 4390
TOKEN = secrets.token_urlsafe(32)
SERVERS = {}
LOCK = threading.Lock()


class LocalFiles(http.server.SimpleHTTPRequestHandler):
    """Serve only the selected release; never directory listings or hidden files."""
    def allowed(self):
        parts = Path(urllib.parse.unquote(urllib.parse.urlsplit(self.path).path)).parts
        target = Path(self.translate_path(self.path)).resolve()
        root = Path(self.directory).resolve()
        return (root == target or root in target.parents) and not any(p.startswith('.') or p in ('node_modules','__pycache__') for p in parts)

    def do_GET(self):
        if not self.allowed():
            self.send_error(403); return
        super().do_GET()

    def do_HEAD(self):
        if not self.allowed():
            self.send_error(403); return
        super().do_HEAD()

    def list_directory(self, path):
        self.send_error(404)

    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache')
        self.send_header('X-Content-Type-Options', 'nosniff')
        super().end_headers()

    def log_message(self, *args):
        pass


def existing_release(port, entry):
    """An occupied port is reused only when it serves exactly this game's entry."""
    try:
        req=urllib.request.Request(f'http://127.0.0.1:{port}/{urllib.parse.quote(entry.name)}',headers={'Cache-Control':'no-cache'})
        with urllib.request.urlopen(req,timeout=1) as response:
            data=response.read(entry.stat().st_size+1)
        return hashlib.sha256(data).digest()==hashlib.sha256(entry.read_bytes()).digest()
    except (OSError,ValueError,urllib.error.URLError):
        return False


def web_url(game):
    entry=Path(game['entry'])
    with LOCK:
        if game['id'] in SERVERS:
            port=SERVERS[game['id']].server_port
        else:
            for port in range(game['port'], game['port']+25):
                try:
                    server=http.server.ThreadingHTTPServer(('127.0.0.1',port),functools.partial(LocalFiles,directory=str(entry.parent)))
                except OSError:
                    if existing_release(port,entry):
                        return f'http://127.0.0.1:{port}/{urllib.parse.quote(entry.name)}'
                    continue
                server.daemon_threads=True
                SERVERS[game['id']]=server
                threading.Thread(target=server.serve_forever,daemon=True).start()
                break
            else:
                raise RuntimeError('ゲーム用のポートが使用中です。起動中のゲームを閉じて再度お試しください。')
    # Keep the original root URL where games previously stored progress.
    suffix='' if entry.name=='index.html' else urllib.parse.quote(entry.name)
    return f'http://127.0.0.1:{port}/{suffix}'


def launch_game(game, prepare=False):
    if not game['available']:
        raise RuntimeError('起動に必要なゲーム本体またはGodotが見つかりません。')
    if game['kind']=='web':
        url=web_url(game)
        if not prepare:subprocess.run(['/usr/bin/open',url],check=True,timeout=10)
        return {'url':url,'message':'ブラウザでゲームを開きました。'}
    if game['kind'] in ('app','file'):
        command=['/usr/bin/open',game['entry']]
        if game['args']:command+=['--args']+game['args']
        if not prepare:subprocess.run(command,check=True,timeout=10)
        return {'message':'ゲームを開きました。Dockまたはブラウザをご確認ください。'}
    engine=godot_binary()
    if not engine:raise RuntimeError('Godotが見つかりません。')
    if not prepare:
        log=Path(tempfile.gettempdir())/'macky-rift-maker.log'
        with log.open('ab') as out:
            process=subprocess.Popen([engine,'--path',str(Path(game['entry']).parent)],stdout=out,stderr=out,start_new_session=True)
        time.sleep(.4)
        if process.poll() is not None:raise RuntimeError(f'Godotが終了しました。ログ: {log}')
    return {'message':'Godot版ゲームを開きました。'}


class Portal(LocalFiles):
    def valid_host(self):
        return self.headers.get('Host') in (f'127.0.0.1:{self.server.server_port}',f'localhost:{self.server.server_port}')

    def reply(self,data,status=200):
        payload=json.dumps(data,ensure_ascii=False).encode()
        self.send_response(status)
        self.send_header('Content-Type','application/json; charset=utf-8')
        self.send_header('Content-Length',str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)

    def do_GET(self):
        if not self.valid_host():self.send_error(403);return
        route=urllib.parse.urlsplit(self.path).path
        if route=='/api/health':
            self.reply({'app':IDENTITY});return
        if route=='/api/games':
            self.reply({'token':TOKEN,'games':[{k:v for k,v in g.items() if k not in ('entry','args','port','cover')}|{'cover':f"/cover/{urllib.parse.quote(g['id'])}" if g['cover'] else None} for g in discover()]});return
        if route.startswith('/cover/'):
            key=urllib.parse.unquote(route[len('/cover/'):])
            game=next((g for g in discover() if g['id']==key),None)
            if not game or not game['cover']:self.send_error(404);return
            path=Path(game['cover'])
            try:
                with path.open('rb') as source:
                    self.send_response(200)
                    self.send_header('Content-Type',self.guess_type(str(path)))
                    self.send_header('Content-Length',str(path.stat().st_size))
                    self.end_headers()
                    import shutil
                    shutil.copyfileobj(source,self.wfile)
            except (BrokenPipeError,ConnectionResetError):pass
            return
        if route not in ('/','/index.html','/style.css','/app.js','/assets/hero.png','/favicon.svg'):
            self.send_error(404);return
        super().do_GET()

    def do_HEAD(self):
        # Never expose Python source through the inherited static HEAD handler.
        self.send_error(405)

    def do_POST(self):
        if not self.valid_host():self.send_error(403);return
        expected={f'http://127.0.0.1:{self.server.server_port}',f'http://localhost:{self.server.server_port}'}
        if self.headers.get('Origin') not in expected or not secrets.compare_digest(self.headers.get('X-Portal-Token',''),TOKEN):
            self.reply({'error':'ポータルを再読み込みしてください。'},403);return
        if self.path not in ('/api/launch','/api/prepare'):
            self.send_error(404);return
        try:
            length=int(self.headers.get('Content-Length','0'))
            if not 0<length<=4096:raise ValueError('Invalid length')
            data=json.loads(self.rfile.read(length))
            if not isinstance(data,dict):raise ValueError('Invalid body')
            game=next((g for g in discover() if g['id']==data.get('id')),None)
            if not game:self.reply({'error':'ゲームが見つかりません。一覧を更新してください。'},404);return
            self.reply(launch_game(game,prepare=self.path=='/api/prepare'))
        except (ValueError,TypeError):self.reply({'error':'リクエストを読み取れませんでした。'},400)
        except (RuntimeError,OSError,subprocess.SubprocessError) as error:self.reply({'error':str(error)},500)


def healthy(port):
    try:
        with urllib.request.urlopen(f'http://127.0.0.1:{port}/api/health',timeout=.4) as response:
            return json.load(response).get('app')==IDENTITY
    except (OSError,ValueError,urllib.error.URLError):return False


def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--serve',action='store_true')
    parser.add_argument('--no-open',action='store_true')
    parser.add_argument('--game',help='Launch a catalog game by its stable ID')
    parser.add_argument('--check',action='store_true',help='Validate/prepare a game without opening it')
    parser.add_argument('--port',type=int,default=DEFAULT_PORT)
    args=parser.parse_args()
    if args.serve:
        server=http.server.ThreadingHTTPServer(('127.0.0.1',args.port),functools.partial(Portal,directory=str(HERE)))
        server.daemon_threads=True
        try:server.serve_forever()
        except KeyboardInterrupt:pass
        finally:server.server_close()
        return
    for port in range(args.port,args.port+10):
        if healthy(port):break
        log=Path(tempfile.gettempdir())/f'macky-game-portal-{port}.log'
        with log.open('ab') as output:
            process=subprocess.Popen([sys.executable,str(Path(__file__).resolve()),'--serve','--port',str(port)],stdout=output,stderr=output,stdin=subprocess.DEVNULL,start_new_session=True)
        for _ in range(30):
            if healthy(port) or process.poll() is not None:break
            time.sleep(.1)
        if healthy(port):break
        if process.poll() is None:process.terminate()
    else:raise RuntimeError('ポータルを起動できませんでした。')
    url=f'http://127.0.0.1:{port}/'
    if args.game:
        with urllib.request.urlopen(url+'api/games',timeout=5) as response:
            catalog=json.load(response)
        request=urllib.request.Request(url+('api/prepare' if args.check else 'api/launch'),
            data=json.dumps({'id':args.game}).encode(),
            headers={'Origin':url.rstrip('/'),'X-Portal-Token':catalog['token'],'Content-Type':'application/json'})
        try:
            with urllib.request.urlopen(request,timeout=45) as response:result=json.load(response)
        except urllib.error.HTTPError as error:
            raise RuntimeError(json.load(error).get('error','ゲームを起動できませんでした。')) from None
        print(result.get('url',result['message']),flush=True)
        return
    print(url,flush=True)
    if not args.no_open:subprocess.run(['/usr/bin/open',url],check=True)


if __name__=='__main__':main()
