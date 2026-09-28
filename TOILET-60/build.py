"""Build a standalone, offline HTML; no third-party packages needed."""
from pathlib import Path
import base64
import json

ROOT = Path(__file__).resolve().parent
source = ROOT / 'src'
html = (source / 'shell.html').read_text()
for token, filename in [('STYLES', 'style.css'), ('CORE', 'core.js'), ('RENDER', 'render.js'), ('APP', 'app.js')]:
    html = html.replace(f'/* {token} */', (source / filename).read_text())
atlases = [ROOT / 'assets' / 'textures' / f'{name}.png' for name in ['civic','school','station','mall','park','office']]
images = ['data:image/png;base64,' + base64.b64encode(p.read_bytes()).decode() for p in atlases]
html = html.replace('/* ASSETS */', 'window.ToiletAssets=' + json.dumps(images) + ';')
(ROOT / 'index.html').write_text(html)
print(f'Built {ROOT / "index.html"} ({len(html.encode()):,} bytes)')
