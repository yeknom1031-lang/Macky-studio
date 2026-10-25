"""Refresh local script/style URLs after edits so browsers cannot mix old and new code."""
from pathlib import Path
import re, hashlib
root=Path(__file__).resolve().parents[1]/'dist'
p=root/'index.html'
def version(match):
    attr,path=match.group(1),match.group(2).split('?')[0]
    source=root/path
    if not source.is_file():return match.group(0)
    return f'{attr}="{path}?v={hashlib.sha256(source.read_bytes()).hexdigest()[:12]}"'
p.write_text(re.sub(r'(src|href)="([^"\n]+\.(?:js|css)(?:\?[^"\n]*)?)"',version,p.read_text()))
