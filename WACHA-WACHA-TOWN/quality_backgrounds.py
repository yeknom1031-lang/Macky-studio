"""Pack generated open buildings and overlapping detail tiles for the offline game.

Image content is made with image generation. This script only extracts references
and packages their pixel coordinates and edge masks for seamless runtime drawing.
The previous accepted backgrounds stay untouched.
"""
import argparse
import json
from pathlib import Path
from PIL import Image, ImageDraw
import numpy as np

ROOT = Path(__file__).resolve().parent
QUALITY = ROOT / 'assets/production/quality'
BOUNDS = [(0, 0, .55, .55), (.45, 0, 1, .55),
          (0, .45, .55, 1), (.45, .45, 1, 1)]


def references(key):
    source = QUALITY / 'source' / (key + '-background.png')
    image = Image.open(source).convert('RGB')
    folder = QUALITY / 'references'
    folder.mkdir(parents=True, exist_ok=True)
    sheet = Image.new('RGB', (1200, 720), 'white')
    pen = ImageDraw.Draw(sheet)
    jobs = []
    for index, bounds in enumerate(BOUNDS):
        box = [round(v * (image.width if i % 2 == 0 else image.height)) for i, v in enumerate(bounds)]
        crop = image.crop(box)
        path = folder / f'{key}-detail-{index}.png'
        crop.save(path)
        thumb = crop.copy()
        thumb.thumbnail((595, 330))
        x, y = (index % 2) * 600, (index // 2) * 360
        sheet.paste(thumb, (x, y + 24))
        pen.text((x + 8, y + 5), f'{key} detail {index}', fill='black')
        jobs.append(dict(id=f'{key}-detail-{index}', stage=key, index=index,
                         reference=str(path.relative_to(ROOT)), bounds=bounds))
    review = QUALITY / 'review'
    review.mkdir(parents=True, exist_ok=True)
    sheet.save(review / f'{key}-references.jpg', quality=92)
    return jobs


def feather(im, bounds):
    """Fade only internal borders; the full map remains beneath the detail tiles."""
    im = im.convert('RGBA')
    x = np.linspace(0, 1, im.width)
    y = np.linspace(0, 1, im.height)
    width = .12
    ax = np.ones(im.width)
    ay = np.ones(im.height)
    if bounds[0] > 0:
        ax *= np.clip(x / width, 0, 1)
    if bounds[2] < 1:
        ax *= np.clip((1 - x) / width, 0, 1)
    if bounds[1] > 0:
        ay *= np.clip(y / width, 0, 1)
    if bounds[3] < 1:
        ay *= np.clip((1 - y) / width, 0, 1)
    im.putalpha(Image.fromarray(np.uint8(255 * ay[:, None] * ax[None, :])))
    return im


def scene_assets(key, w, h, emit):
    path = QUALITY / 'source' / (key + '-background.png')
    if not path.exists() or not (QUALITY / 'receipts' / (key + '.json')).exists():
        return {}
    base = Image.open(path)
    background = key + '-open-background'
    emit(background, base, quality=96)
    tiles = []
    source_pixels = list(base.size)
    for index, bounds in enumerate(BOUNDS):
        tile_key = f'{key}-detail-{index}'
        tile_path = QUALITY / 'source' / (tile_key + '.png')
        receipt = QUALITY / 'receipts' / (tile_key + '.json')
        if not tile_path.exists() or not receipt.exists():
            continue
        image = Image.open(tile_path)
        emit(tile_key, feather(image, bounds), quality=96)
        x0, y0, x1, y1 = bounds
        tiles.append(dict(image=tile_key, x=x0*w, y=y0*h,
                          w=(x1-x0)*w, h=(y1-y0)*h,
                          pixels=list(image.size)))
    return dict(background=background, backgroundTiles=tiles,
                backgroundPixels=source_pixels, openBuildings=True,
                detailPixelWidth=round(min(t['pixels'][0]/(BOUNDS[i][2]-BOUNDS[i][0]) for i,t in enumerate(tiles))) if len(tiles)==4 else base.width)


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('stage')
    args = parser.parse_args()
    print(json.dumps(references(args.stage), ensure_ascii=False))
