"""Make lightweight viewing copies and a contact-sheet page from original generated PNGs.
Original generated artwork is preserved byte-for-byte.
"""
from pathlib import Path
import json, html
from PIL import Image

ROOT=Path(__file__).resolve().parent
data=json.loads((ROOT/'prompts.json').read_text())
manifest=[]
image_count=0
for game in data['games']:
    name=f"{game['id']:02d}-{game['slug']}"
    source=ROOT/'images'/f'{name}.png'
    if not source.exists(): continue
    with Image.open(source) as im:
        width,height=im.size
        preview=im.copy();preview.thumbnail((1280,640))
        preview.convert('RGB').save(source.with_suffix('.webp'),quality=90,method=6)
    image_count += 1
    variants=[]
    for variant in game.get('variantImages', []):
        variant_path=ROOT/variant['file']
        if variant_path == source or not variant_path.exists(): continue
        with Image.open(variant_path) as im:
            preview=im.copy();preview.thumbnail((1280,640))
            preview.convert('RGB').save(variant_path.with_suffix('.webp'),quality=90,method=6)
            variants.append({'file':variant['file'],'preview':str(variant_path.with_suffix('.webp').relative_to(ROOT)),'label':variant['label'],'width':im.width,'height':im.height})
        image_count += 1
    manifest.append({'variants':variants,'id':game['id'],'title':game['title'],'file':f'images/{name}.png','preview':f'images/{name}.webp','width':width,'height':height,'aspect':round(width/height,4)})
(ROOT/'manifest.json').write_text(json.dumps({'count':len(manifest),'imageCount':image_count,'orientation':'landscape','images':manifest},ensure_ascii=False,indent=2))
cards=''.join(f'<article><img src="{g["preview"]}" alt="{html.escape(g["title"])}"><p><b>{g["id"]:02d}</b> {html.escape(g["title"])}</p></article>' for g in manifest)
page='''<!doctype html><html lang="ja"><head><meta charset="utf-8"><title>__COUNT__種類の画面一覧</title><style>
*{box-sizing:border-box}body{margin:0;padding:30px;background:#fff8e8;color:#19334a;font-family:"Hiragino Kaku Gothic ProN",Meiryo,sans-serif;width:1800px}header{display:flex;align-items:end;justify-content:space-between;margin:0 0 23px}h1{font-size:31px;margin:0}header span{font-size:15px;font-weight:700}main{display:grid;grid-template-columns:repeat(4,1fr);gap:19px}article{border:2px solid #19334a;border-radius:10px;overflow:hidden;background:#fffdf7}img{display:block;width:100%;aspect-ratio:2.16;object-fit:contain;background:#19334a}p{margin:0;padding:12px 10px;font-size:14px;font-weight:800;white-space:nowrap}b{color:#e75c34;margin-right:5px}footer{font-size:12px;margin-top:20px;color:#5e726b}</style></head><body><header><h1>九九ビート大放送 — __COUNT__のミニゲーム画面</h1><span>スマホ横画面 / SCREEN DESIGN COLLECTION</span></header><main>'''+cards+'''</main><footer>画像生成による画面デザイン案。元のPNGと各ゲームの説明は、付属の画面デザイン一覧から確認できます。</footer></body></html>'''
(ROOT/'contact-sheet.html').write_text(page.replace('__COUNT__',str(len(manifest))))
print(json.dumps({'generated':len(manifest),'sizes':sorted(set((g['width'],g['height']) for g in manifest))},ensure_ascii=False))
