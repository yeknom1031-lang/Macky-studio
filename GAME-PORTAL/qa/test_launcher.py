import functools
import http.server
import json
from pathlib import Path
import plistlib
import sys
import tempfile
import threading
import unittest
from unittest.mock import patch
import urllib.error
import urllib.request

sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
import server
from catalog import discover

class LauncherTests(unittest.TestCase):
    def test_catalog_entries_and_app_binaries(self):
        games=discover()
        self.assertEqual(len({g['id'] for g in games}),len(games))
        for g in games:
            with self.subTest(id=g['id']):
                self.assertTrue(g['available'])
                entry=Path(g['entry'])
                self.assertTrue(entry.exists())
                if g['kind']=='app':
                    with (entry/'Contents/Info.plist').open('rb') as f:info=plistlib.load(f)
                    self.assertTrue((entry/'Contents/MacOS'/info['CFBundleExecutable']).is_file())
    def test_native_launch_arguments(self):
        with patch('server.subprocess.run') as run:
            for g in discover():
                if g['kind'] not in ('app','file'):continue
                server.launch_game(g)
                args=run.call_args.args[0]
                self.assertEqual(args[:2],['/usr/bin/open',g['entry']])
                if g['id']=='medal-party':self.assertEqual(args[-2:],['--args','--party'])
    def test_occupied_port_does_not_open_wrong_game(self):
        with tempfile.TemporaryDirectory() as d1,tempfile.TemporaryDirectory() as d2:
            Path(d1,'index.html').write_text('<html>Wrong game</html>')
            entry=Path(d2,'index.html');entry.write_text('<html>Correct game</html>')
            occupied=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(server.LocalFiles,directory=d1))
            threading.Thread(target=occupied.serve_forever,daemon=True).start()
            g={'id':'test-port-conflict','entry':str(entry),'port':occupied.server_port}
            try:
                url=server.web_url(g)
                self.assertNotEqual(urllib.parse.urlsplit(url).port,occupied.server_port)
                with urllib.request.urlopen(url) as response:self.assertIn(b'Correct game',response.read())
                self.assertEqual(server.web_url(g),url)
            finally:
                occupied.shutdown();occupied.server_close()
                child=server.SERVERS.pop(g['id']);child.shutdown();child.server_close()
    def test_local_api_rejects_untrusted_launches_and_paths(self):
        httpd=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(server.Portal,directory=str(server.HERE)))
        threading.Thread(target=httpd.serve_forever,daemon=True).start()
        base=f'http://127.0.0.1:{httpd.server_port}'
        def request(route,origin=None,token=None,data=None):
            headers={}
            if origin:headers['Origin']=origin
            if token:headers['X-Portal-Token']=token
            req=urllib.request.Request(base+route,data=json.dumps(data).encode() if data is not None else None,headers=headers)
            try:return urllib.request.urlopen(req)
            except urllib.error.HTTPError as error:return error
        try:
            with request('/api/launch',data={'id':'WHITE-ROOM'}) as r:self.assertEqual(r.status,403)
            with request('/api/launch',origin='https://example.com',token=server.TOKEN,data={'id':'WHITE-ROOM'}) as r:self.assertEqual(r.status,403)
            with request('/api/launch',origin=base,token=server.TOKEN,data={'id':'../../etc/passwd'}) as r:self.assertEqual(r.status,404)
            for path in ['/server.py','/../AGENTS.md','/%2e%2e/.git/config','/cover/../../etc/passwd']:
                with request(path) as r:self.assertEqual(r.status,404)
            with request('/api/prepare',origin=base,token=server.TOKEN,data={'id':'WHITE-ROOM'}) as r:self.assertEqual(r.status,200)
        finally:httpd.shutdown();httpd.server_close()

if __name__=='__main__':unittest.main()
