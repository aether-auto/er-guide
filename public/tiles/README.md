# Map tiles — provenance, format, and the .webp decision

Mirrored by `scripts/fetch-tiles.mjs` (map-v2 Task M1) from the Fextralife
Elden Ring interactive map app, 2026-06-10. Tiles are deliberately committed —
CI must not re-download from Fextralife on each build.

## Layout / UI template

```
public/tiles/{code}/{z}/{x}/{y}.webp
```

- `code` ∈ `overworld` (mapA) | `underground` (mapB) | `ashen` (mapC, Leyndell
  Ashen Capital) | `dlc` (mapD, Realm of Shadow)
- Zoom **0..6** mirrored. The source pyramids go to z7; the UI must use
  `maxZoom: 7, maxNativeZoom: 6` and let Leaflet upscale z7.
- **The extension is `.webp`, not `.jpg`.** The source tiles are JPEG, but the
  full z0..6 mirror measured ~372MB as JPEG — over the 250MB repo budget — so
  every tile is recompressed to **webp q72** (~20% of the JPEG bytes, ~70MB
  total). `MapView` must use
  `${BASE_URL}tiles/${code}/{z}/{x}/{y}.webp` as its tile template.
- CRS is `L.CRS.Simple`; each layer is a 256px-tile square pyramid (2^z tiles
  per axis; the iframes advertise 35000px bounds at z7 but the actual imagery
  is 32768px = 256·2^7, so every z has a full 2^z × 2^z grid).

## Source templates (discovered from the iframe HTML)

| code | Fextralife template (relative to eldenring.wiki.fextralife.com) |
| --- | --- |
| overworld | `/file/Elden-Ring/map-50be4728-3907-4f33-8857-7f063e0d24eb/map-tiles.4/{z}/{x}/{y}.jpg` |
| underground | `/file/Elden-Ring/map-c5431314-6159-4599-9668-0ccf4e1f8e9a/map-tiles.4/{z}/{x}/{y}.jpg` |
| ashen | `/file/Elden-Ring/map-96747699-d8a3-44b4-b2d6-cf6b45c579c6/map-tiles.1/{z}/{x}/{y}.jpg` |
| dlc | `/file/Elden-Ring/map-9d02bccc-081b-4a1d-b26e-a363f366fb40/map-tiles.3/{z}/{x}/{y}.jpg` |

## Licensing / attribution

Map imagery © FromSoftware / Bandai Namco; tile pyramid assembled by the
Fextralife community (eldenring.wiki.fextralife.com). This is an open-source,
non-commercial fan project; imagery will be removed on request. Attribution
also lives in the site footer / README per the spec.
