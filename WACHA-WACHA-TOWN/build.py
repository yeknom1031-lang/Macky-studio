"""Bundle original generated images and local scripts into an offline HTML game.

Sprite metadata is measured from alpha pixels. The original PNGs are never edited.
"""
from pathlib import Path
import base64
import json
import hashlib

ROOT = Path(__file__).resolve().parent


def measure_sprites():
    from PIL import Image
    import numpy as np
    characters = []
    for source, rows in [('walk-a',5), ('walk-b',5), ('walk-c',6)]:
        image = Image.open(ROOT / 'assets' / f'{source}.png')
        alpha = np.asarray(image)[:, :, 3]
        projection = (alpha > 180).sum(axis=1)
        bounds = [0]
        for k in range(1, rows):
            middle = round(k * image.height / rows)
            low, high = middle - 22, middle + 22
            bounds.append(low + int(np.argmin(projection[low:high])))
        bounds.append(image.height)
        for row in range(rows):
            y0, y1 = bounds[row:row + 2]
            active = (alpha[y0:y1] > 180).sum(axis=0) > 15
            runs, begin = [], None
            for x, value in enumerate(active):
                if value and begin is None:
                    begin = x
                if not value and begin is not None:
                    if x - begin > 20:
                        runs.append((begin, x))
                    begin = None
            if begin is not None:
                runs.append((begin, image.width))
            assert len(runs) >= 15, f'{source} row {row}: only {len(runs)} frames'
            centers = [(a + b) / 2 for a, b in runs]
            frames, hashes = [], []
            # The first sheet contains 16 source poses. Use the first 15 consistently.
            for i in range(15):
                x0 = 0 if i == 0 else round((centers[i - 1] + centers[i]) / 2)
                x1 = image.width if i == len(centers) - 1 else round((centers[i] + centers[i + 1]) / 2)
                yy, xx = np.nonzero(alpha[y0:y1, x0:x1] > 180)
                assert len(xx) > 100
                left, top = max(x0, x0 + int(xx.min()) - 2), max(y0, y0 + int(yy.min()) - 2)
                right, bottom = min(x1, x0 + int(xx.max()) + 3), min(y1, y0 + int(yy.max()) + 3)
                frames.append(dict(x=left, y=top, w=right-left, h=bottom-top))
                hashes.append(hashlib.sha256(image.crop((left, top, right, bottom)).tobytes()).hexdigest())
            assert len(set(hashes)) == 15, 'Animation poses must be distinct'
            characters.append(dict(source=source, row=row, source_frames=len(runs), frames=frames))
    return dict(frame_count=15, base_count=16, palette_count=20, characters=characters)


def main():
    metadata_path = ROOT / 'assets' / 'sprite-meta.json'
    if not metadata_path.exists() or json.loads(metadata_path.read_text()).get('base_count') != 16:
        metadata_path.write_text(json.dumps(measure_sprites(), ensure_ascii=False, indent=2))
    meta = json.loads(metadata_path.read_text())
    from build_runtime_assets import make_runtime
    atlas_meta=make_runtime(meta)
    images = {p.stem: 'data:image/'+('webp' if p.suffix=='.webp' else 'png')+';base64,' + base64.b64encode(p.read_bytes()).decode()
              for p in sorted((ROOT / 'assets' / 'runtime').glob('*')) if p.suffix in ('.png','.webp')}
    assets = dict(meta=meta, atlas=atlas_meta, images=images, navigation=json.loads((ROOT/'assets'/'navigation.json').read_text()))
    html = (ROOT / 'src' / 'shell.html').read_text()
    replace = {
        'STYLE': (ROOT / 'src' / 'style.css').read_text(),
        'ASSETS': 'const WACHA_ASSETS=' + json.dumps(assets, ensure_ascii=False, separators=(',', ':')) + ';',
        'CORE': (ROOT / 'src' / 'core.js').read_text(),
        'LIFE': (ROOT / 'src' / 'life.js').read_text(),
        'RENDER': (ROOT / 'src' / 'render.js').read_text(),
        'APP': (ROOT / 'src' / 'app.js').read_text()
    }
    for key, value in replace.items():
        html = html.replace('/*' + key + '*/', value)
    out = ROOT / 'index.html'
    out.write_text(html)
    print(f'Built {out}: {out.stat().st_size / 1024 / 1024:.1f} MiB')


if __name__ == '__main__':
    main()
