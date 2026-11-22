"""Cut mascot poses out of the character sheet and remove the cream (and sage shadow) background.

Background removal: flood fill from the crop border through pixels that look like the sheet's
cream paper or the sage ground shadows. Regions enclosed by the black outline (body, eye whites)
are never reached, so they keep their cream color.
"""
import sys
from collections import deque

import numpy as np
from PIL import Image

SHEET = 'assets/source/mascot-sheet.webp'
OUT = 'assets/mascot'

# name: (left, top, right, bottom) in sheet pixels
BOXES = {
    'labi-hello': (12, 12, 438, 500),
    'labi-front': (452, 18, 732, 378),
    'labi-success': (282, 498, 556, 762),
    'labi-waiting': (556, 498, 792, 762),
    'labi-oops': (796, 498, 1030, 762),
    'labi-empty': (1034, 498, 1278, 762),
    'labi-determined': (1280, 498, 1530, 762),
    'labi-happy': (22, 498, 280, 762),
    'labi-scan': (12, 780, 262, 1018),
    'labi-coding': (268, 780, 500, 1018),
    'labi-clipboard': (500, 780, 718, 1018),
    'labi-reading': (722, 780, 1004, 1018),
}

PAPER = np.array([249, 241, 232], dtype=np.int32)
SAGE_HUE_OK = lambda r, g, b: (g > r + 12) & (g > b - 10) & (r > 110) & (g > 150)  # noqa: E731


def background_mask(rgb: np.ndarray) -> np.ndarray:
    diff = np.abs(rgb.astype(np.int32) - PAPER).sum(axis=2)
    paper = diff < 60
    r, g, b = rgb[..., 0].astype(np.int32), rgb[..., 1].astype(np.int32), rgb[..., 2].astype(np.int32)
    sage = SAGE_HUE_OK(r, g, b)
    return paper | sage


def flood_from_border(candidate: np.ndarray) -> np.ndarray:
    h, w = candidate.shape
    seen = np.zeros_like(candidate, dtype=bool)
    q = deque()
    for x in range(w):
        for y in (0, h - 1):
            if candidate[y, x] and not seen[y, x]:
                seen[y, x] = True
                q.append((y, x))
    for y in range(h):
        for x in (0, w - 1):
            if candidate[y, x] and not seen[y, x]:
                seen[y, x] = True
                q.append((y, x))
    while q:
        y, x = q.popleft()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            ny, nx = y + dy, x + dx
            if 0 <= ny < h and 0 <= nx < w and candidate[ny, nx] and not seen[ny, nx]:
                seen[ny, nx] = True
                q.append((ny, nx))
    return seen


def drop_small_islands(alpha: np.ndarray, min_px: int) -> np.ndarray:
    """Remove opaque specks (neighbor pose leftovers, compression noise) smaller than min_px."""
    h, w = alpha.shape
    opaque = alpha > 0
    label = np.zeros((h, w), dtype=np.int32)
    keep = np.zeros_like(opaque)
    cur = 0
    for sy in range(h):
        for sx in range(w):
            if opaque[sy, sx] and label[sy, sx] == 0:
                cur += 1
                comp = [(sy, sx)]
                label[sy, sx] = cur
                i = 0
                while i < len(comp):
                    y, x = comp[i]
                    i += 1
                    for dy in (-1, 0, 1):
                        for dx in (-1, 0, 1):
                            ny, nx = y + dy, x + dx
                            if 0 <= ny < h and 0 <= nx < w and opaque[ny, nx] and label[ny, nx] == 0:
                                label[ny, nx] = cur
                                comp.append((ny, nx))
                if len(comp) >= min_px:
                    ys, xs = zip(*comp)
                    keep[list(ys), list(xs)] = True
    out = alpha.copy()
    out[~keep] = 0
    return out


def sticker(img: Image.Image, width: int) -> Image.Image:
    """Cream sticker edge around the silhouette, so the black outlines and legs still read on dark cards."""
    from PIL import ImageFilter

    pad = width + 4
    canvas = Image.new('RGBA', (img.width + pad * 2, img.height + pad * 2), (0, 0, 0, 0))
    canvas.paste(img, (pad, pad), img)
    grown = canvas.split()[3].point(lambda v: 255 if v > 40 else 0)
    for _ in range(max(1, width // 2)):
        grown = grown.filter(ImageFilter.MaxFilter(5))
    grown = grown.filter(ImageFilter.GaussianBlur(1.5)).point(lambda v: 255 if v > 110 else 0)
    edge = Image.new('RGBA', canvas.size, (248, 245, 238, 255))
    edge.putalpha(grown)
    return Image.alpha_composite(edge, canvas)


def cut(name, box, scale=3):
    sheet = Image.open(SHEET).convert('RGB')
    crop = sheet.crop(box)
    rgb = np.array(crop)
    bg = flood_from_border(background_mask(rgb))
    alpha = np.where(bg, 0, 255).astype(np.uint8)
    alpha = drop_small_islands(alpha, min_px=60)
    rgba = np.dstack([rgb, alpha])
    img = Image.fromarray(rgba, 'RGBA')
    bbox = img.getbbox()
    img = img.crop(bbox)
    # Upscale for crisp rendering on high-density screens.
    img = img.resize((img.width * scale, img.height * scale), Image.LANCZOS)
    img = sticker(img, width=8 * scale)
    img = img.quantize(colors=256, method=Image.FASTOCTREE, dither=Image.NONE)  # ~5x smaller
    img.save(f'{OUT}/{name}.png', optimize=True)
    return img


if __name__ == '__main__':
    import os

    os.makedirs(OUT, exist_ok=True)
    names = sys.argv[1:] or list(BOXES)
    for n in names:
        im = cut(n, BOXES[n], scale=2)
        print(n, im.size)
