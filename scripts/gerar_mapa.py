"""Gera, a partir do GeoJSON dos municípios do Ceará (IBGE):
 - mapa/municipios.sql  (tabela municipios: código IBGE e nome)
 - mapa/mapa_ce.js      (contornos já projetados em SVG, para embutir no site)
Uso: python3 scripts/gerar_mapa.py mapa/ce-municipios.geojson mapa
"""
import json, math, sys

src, out = sys.argv[1], sys.argv[2]
feats = json.load(open(src, encoding="utf-8"))["features"]
for f in feats:
    f["properties"]["name"] = {"Itapagé": "Itapajé"}.get(f["properties"]["name"], f["properties"]["name"])

def rdp(pts, eps):
    if len(pts) < 3: return pts
    (x1, y1), (x2, y2) = pts[0], pts[-1]
    dx, dy = x2 - x1, y2 - y1; n = math.hypot(dx, dy) or 1e-12
    dmax, idx = 0, 0
    for i in range(1, len(pts) - 1):
        d = abs(dy * pts[i][0] - dx * pts[i][1] + x2 * y1 - y2 * x1) / n
        if d > dmax: dmax, idx = d, i
    if dmax > eps:
        return rdp(pts[:idx + 1], eps)[:-1] + rdp(pts[idx:], eps)
    return [pts[0], pts[-1]]

allpts = [p for f in feats for ring in f["geometry"]["coordinates"] for p in ring]
minx = min(p[0] for p in allpts); maxx = max(p[0] for p in allpts)
miny = min(p[1] for p in allpts); maxy = max(p[1] for p in allpts)
lat0 = math.radians((miny + maxy) / 2); W = 1000
k = W / ((maxx - minx) * math.cos(lat0)); H = round((maxy - miny) * k)
proj = lambda p: ((p[0] - minx) * math.cos(lat0) * k, (maxy - p[1]) * k)

mapa = {}
linhas = []
for f in feats:
    cod = int(f["properties"]["id"]); nome = f["properties"]["name"]
    d = ""; cx = cy = area = 0
    for ring in f["geometry"]["coordinates"]:
        pts = rdp([proj(p) for p in ring], 0.6)
        if len(pts) < 4: pts = [proj(p) for p in ring]
        d += "M" + "L".join(f"{x:.1f},{y:.1f}" for x, y in pts) + "Z"
    ring = [proj(p) for p in f["geometry"]["coordinates"][0]]
    for (x1, y1), (x2, y2) in zip(ring, ring[1:]):
        c = x1 * y2 - x2 * y1; area += c; cx += (x1 + x2) * c; cy += (y1 + y2) * c
    area /= 2; cx /= 6 * area; cy /= 6 * area
    mapa[cod] = {"n": nome, "d": d, "c": [round(cx, 1), round(cy, 1)]}
    linhas.append(f"({cod}, '{nome.replace(chr(39), chr(39)*2)}')")

open(f"{out}/mapa_ce.js", "w", encoding="utf-8").write(
    f"window.MAPA_CE={{w:{W},h:{H},m:" + json.dumps(mapa, ensure_ascii=False, separators=(",", ":")) + "};\n")
open(f"{out}/municipios.sql", "w", encoding="utf-8").write(
    "insert into public.municipios (ibge, nome) values\n" + ",\n".join(linhas) +
    "\non conflict (ibge) do update set nome = excluded.nome;\n")
print(len(mapa), "municípios;", W, "x", H)
