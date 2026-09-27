"""Build a standalone, offline HTML; no third-party packages needed."""
from pathlib import Path

ROOT = Path(__file__).resolve().parent
source = ROOT / 'src'
html = (source / 'shell.html').read_text()
for token, filename in [('STYLES', 'style.css'), ('CORE', 'core.js'), ('RENDER', 'render.js'), ('APP', 'app.js')]:
    html = html.replace(f'/* {token} */', (source / filename).read_text())
(ROOT / 'index.html').write_text(html)
print(f'Built {ROOT / "index.html"} ({len(html.encode()):,} bytes)')
