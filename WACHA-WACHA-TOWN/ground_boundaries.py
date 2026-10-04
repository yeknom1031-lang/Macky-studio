"""Reviewed limits of real land, before colour-based pavement extraction.

Coordinates follow the canonical 1672 x 941 composition. The mask is inset by
14 canonical pixels: more than the runtime navigation stamp plus its grid cell
rounding, so collision avoidance cannot push a foot into water or open sky.
"""
import json
from pathlib import Path
from functools import lru_cache
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

CONFIG = Path(__file__).resolve().parent / 'assets/production/navigation/ground-boundaries.json'

@lru_cache(maxsize=32)
def allowed_ground(stage, size=(1672,941), inset=True):
    data=json.loads(CONFIG.read_text()) if CONFIG.exists() else {}
    item=data.get(stage)
    if not item:return None
    mask=Image.new('L',(1672,941));draw=ImageDraw.Draw(mask)
    for polygon in item['polygons']:draw.polygon([tuple(p) for p in polygon],fill=255)
    for polygon in item.get('holes',[]):draw.polygon([tuple(p) for p in polygon],fill=0)
    if inset:mask=mask.filter(ImageFilter.MinFilter(29))
    if size!=mask.size:mask=mask.resize(size,Image.Resampling.NEAREST)
    return np.asarray(mask)>0
