"""Restore unchanged licensed source downloads listed in sources.json.

Large originals are intentionally excluded from Git and application bundles.
Their exact origin, license evidence and SHA-256 stay in this directory.
"""
from pathlib import Path
from urllib.request import Request,urlopen
import hashlib,json
root=Path(__file__).resolve().parent
for item in json.loads((root/'sources.json').read_text()):
 dest=root/item['file'];dest.parent.mkdir(exist_ok=True)
 if dest.exists() and hashlib.sha256(dest.read_bytes()).hexdigest()==item['sha256']:
  print(item['id'],'already verified');continue
 data=urlopen(Request(item['download'],headers={'User-Agent':'WachaTown-Audio-Restore/1.0'}),timeout=60).read()
 if hashlib.sha256(data).hexdigest()!=item['sha256']:raise SystemExit(f"Checksum changed: {item['id']}; inspect the source manually.")
 dest.write_bytes(data);print(item['id'],'restored and verified')
