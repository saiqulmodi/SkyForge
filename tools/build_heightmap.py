"""Builds assets/terrain/south_india.png from AWS Terrain Tiles (Mapzen "terrarium" encoding, zoom 7).

Usage:  python -I tools/build_heightmap.py <tile_dir> <out_dir>
Tiles are named {x}_{y}.png (x 90-94, y 56-61), downloaded from
https://s3.amazonaws.com/elevation-tiles-prod/terrarium/7/{x}/{y}.png

Output: an 8-bit greyscale PNG on a plain lat/lon grid (north at the top):
  0      = sea (elevation <= 0 m)
  1..255 = land, elevation = (value - 1) * STEP_M metres AMSL
plus south_india.json with the grid bounds. Data: SRTM, GMTED, ETOPO1 via Mapzen / AWS Open Data.
"""
import json
import math
import sys
from pathlib import Path

import numpy as np
from PIL import Image

ZOOM = 7
TILE = 256
X_RANGE = range(90, 95)
Y_RANGE = range(56, 62)
LAT_MIN, LAT_MAX = 8.0, 19.5
LON_MIN, LON_MAX = 74.0, 85.0
PX_PER_DEG = 96          # ~1.16 km per pixel
STEP_M = 11              # metres per grey level (max 2,794 m; Anamudi is 2,695 m)


def load_mosaic(tile_dir):
    w = len(X_RANGE) * TILE
    h = len(Y_RANGE) * TILE
    elev = np.zeros((h, w), dtype=np.float32)
    for i, x in enumerate(X_RANGE):
        for j, y in enumerate(Y_RANGE):
            rgb = np.asarray(Image.open(tile_dir / f"{x}_{y}.png").convert("RGB"), dtype=np.float32)
            tile = rgb[:, :, 0] * 256 + rgb[:, :, 1] + rgb[:, :, 2] / 256 - 32768
            elev[j * TILE:(j + 1) * TILE, i * TILE:(i + 1) * TILE] = tile
    return elev


def mercator_pixel(lat, lon):
    """Global pixel coordinates at ZOOM for lat/lon arrays (Web Mercator)."""
    n = TILE * (2 ** ZOOM)
    px = (lon + 180.0) / 360.0 * n
    lat_r = np.radians(lat)
    py = (1.0 - np.log(np.tan(lat_r) + 1.0 / np.cos(lat_r)) / math.pi) / 2.0 * n
    return px, py


def main():
    tile_dir = Path(sys.argv[1])
    out_dir = Path(sys.argv[2])
    out_dir.mkdir(parents=True, exist_ok=True)

    mosaic = load_mosaic(tile_dir)
    width = int(round((LON_MAX - LON_MIN) * PX_PER_DEG))
    height = int(round((LAT_MAX - LAT_MIN) * PX_PER_DEG))
    lons = LON_MIN + (np.arange(width) + 0.5) / PX_PER_DEG
    lats = LAT_MAX - (np.arange(height) + 0.5) / PX_PER_DEG
    lon_g, lat_g = np.meshgrid(lons, lats)
    px, py = mercator_pixel(lat_g, lon_g)
    px -= X_RANGE.start * TILE
    py -= Y_RANGE.start * TILE

    # Bilinear sample of the mosaic
    x0 = np.clip(np.floor(px).astype(int), 0, mosaic.shape[1] - 2)
    y0 = np.clip(np.floor(py).astype(int), 0, mosaic.shape[0] - 2)
    fx = np.clip(px - x0, 0, 1)
    fy = np.clip(py - y0, 0, 1)
    e = (mosaic[y0, x0] * (1 - fx) * (1 - fy) + mosaic[y0, x0 + 1] * fx * (1 - fy)
         + mosaic[y0 + 1, x0] * (1 - fx) * fy + mosaic[y0 + 1, x0 + 1] * fx * fy)

    grey = np.where(e <= 0, 0, np.clip(1 + np.round(e / STEP_M), 1, 255)).astype(np.uint8)
    Image.fromarray(grey, mode="L").save(out_dir / "south_india.png", optimize=True)
    meta = {
        "latMin": LAT_MIN, "latMax": LAT_MAX, "lonMin": LON_MIN, "lonMax": LON_MAX,
        "width": width, "height": height, "stepM": STEP_M,
        "attribution": "Terrain: SRTM, GMTED2010, ETOPO1 via Mapzen Terrain Tiles (AWS Open Data)"
    }
    (out_dir / "south_india.json").write_text(json.dumps(meta, indent=2))
    land = e > 0
    print(f"{width}x{height}, land {land.mean() * 100:.0f}%, max {e.max():.0f} m, "
          f"size {(out_dir / 'south_india.png').stat().st_size / 1024:.0f} KB")


if __name__ == "__main__":
    main()
