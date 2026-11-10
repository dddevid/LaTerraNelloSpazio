"""Costruisce js/data/padana-dem.js con quote REALI (NASA SRTM via AWS Terrarium tiles)
e il corso reale del Po (Natural Earth). Si esegue una sola volta:  python tools/build_padana_dem.py
"""
import base64, io, json, math, os, urllib.request
import numpy as np
from PIL import Image

LON0, LON1, LAT0, LAT1 = 6.5, 14.0, 43.5, 47.0
GW, GH = 240, 140
Z = 8
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CACHE = os.path.join(ROOT, 'tools', 'tiles')
os.makedirs(CACHE, exist_ok=True)


def world_px(lon, lat):
    n = 256 * 2 ** Z
    x = (lon + 180.0) / 360.0 * n
    s = math.sin(math.radians(lat))
    y = (0.5 - math.log((1 + s) / (1 - s)) / (4 * math.pi)) * n
    return x, y


x0, y0 = world_px(LON0, LAT1)
x1, y1 = world_px(LON1, LAT0)
tx0, tx1 = int(x0 // 256), int(x1 // 256)
ty0, ty1 = int(y0 // 256), int(y1 // 256)
W, H = (tx1 - tx0 + 1) * 256, (ty1 - ty0 + 1) * 256
big = np.zeros((H, W), dtype=np.float32)

for ty in range(ty0, ty1 + 1):
    for tx in range(tx0, tx1 + 1):
        f = os.path.join(CACHE, f'{Z}_{tx}_{ty}.png')
        if not os.path.exists(f):
            url = f'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{Z}/{tx}/{ty}.png'
            urllib.request.urlretrieve(url, f)
        px = np.array(Image.open(f).convert('RGB'), dtype=np.float32)
        elev = px[..., 0] * 256.0 + px[..., 1] + px[..., 2] / 256.0 - 32768.0
        big[(ty - ty0) * 256:(ty - ty0 + 1) * 256, (tx - tx0) * 256:(tx - tx0 + 1) * 256] = elev
print('tile', tx1 - tx0 + 1, 'x', ty1 - ty0 + 1)

# campionamento bilineare sulla griglia lon/lat regolare
grid = np.zeros((GH, GW), dtype=np.float32)
for j in range(GH):
    lat = LAT1 - (LAT1 - LAT0) * j / (GH - 1)
    for i in range(GW):
        lon = LON0 + (LON1 - LON0) * i / (GW - 1)
        px, py = world_px(lon, lat)
        px -= tx0 * 256
        py -= ty0 * 256
        ix, iy = int(px), int(py)
        fx, fy = px - ix, py - iy
        ix = min(max(ix, 0), W - 2)
        iy = min(max(iy, 0), H - 2)
        grid[j, i] = (big[iy, ix] * (1 - fx) * (1 - fy) + big[iy, ix + 1] * fx * (1 - fy) +
                      big[iy + 1, ix] * (1 - fx) * fy + big[iy + 1, ix + 1] * fx * fy)
grid = np.clip(np.round(grid), 0, None).astype('<i2')  # mare = 0 m


def val(lon, lat):
    i = round((lon - LON0) / (LON1 - LON0) * (GW - 1))
    j = round((LAT1 - lat) / (LAT1 - LAT0) * (GH - 1))
    return int(grid[j, i])


print('max', int(grid.max()), 'Milano', val(9.19, 45.46), 'Venezia', val(12.33, 45.44),
      'Torino', val(7.69, 45.07), 'Monte Bianco', val(6.865, 45.833))

# fiumi reali
rivers = []
wanted = {'po': 'Po', 'ticino': 'Ticino', 'dora baltea': 'Dora Baltea'}
for f in json.load(open(os.path.join(ROOT, 'tools', 'rivers.json'), encoding='utf8'))['features']:
    nm = (f['properties'].get('name') or '').lower()
    if nm not in wanted:
        continue
    g = f['geometry']
    lines = g['coordinates'] if g['type'] == 'MultiLineString' else [g['coordinates']]
    for ln in lines:
        pts = [[round(p[0], 3), round(p[1], 3)] for p in ln
               if LON0 - 0.2 <= p[0] <= LON1 + 0.2 and LAT0 - 0.2 <= p[1] <= LAT1 + 0.2]
        if len(pts) > 1:
            rivers.append({'n': wanted[nm], 'p': pts})
print('fiumi', [(r['n'], len(r['p'])) for r in rivers])

out = {
    'w': GW, 'h': GH, 'lon0': LON0, 'lon1': LON1, 'lat0': LAT0, 'lat1': LAT1,
    'data': base64.b64encode(grid.tobytes()).decode('ascii'),
    'rivers': rivers,
}
os.makedirs(os.path.join(ROOT, 'js', 'data'), exist_ok=True)
with open(os.path.join(ROOT, 'js', 'data', 'padana-dem.js'), 'w', encoding='utf8') as fh:
    fh.write('// Dati reali: NASA SRTM (AWS Terrain Tiles) + fiumi Natural Earth. Generato da tools/build_padana_dem.py\n')
    fh.write('window.PADANA_DEM = ' + json.dumps(out, separators=(',', ':')) + ';\n')

# anteprima per controllo visivo
scratch = os.path.join(os.environ.get('TEMP', '.'), 'padana_dem_preview.png')
g = np.clip(grid.astype(np.float32) / 3000.0, 0, 1)
Image.fromarray((g * 255).astype('uint8')).resize((GW * 4, GH * 4)).save(scratch)
print('preview', scratch)
