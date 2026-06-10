# Map marker cache — provenance & payload shape

Fetched by `scripts/fetch.mjs` (section 3). Discovery performed 2026-06-09 (Task 5 Step 3).

## Source: Fextralife Elden Ring Interactive Map (option 1 of the fallback chain — succeeded)

The Fextralife map app does **not** load markers from a separate JSON endpoint. The map
pages embed one `<iframe>` per map layer, and each iframe's HTML contains the complete
marker dataset inline as JavaScript array literals:

```js
var items = [ { ...marker... }, ... ];        // the markers
var categories = [ { "id": "Armor", ... } ];  // the category/layer list
var mapCode = 'mapA';
```

`fetch.mjs` downloads each iframe and extracts those literals verbatim (no transformation
of marker values).

### Map pages (parents of the iframes)

| Page | URL |
| --- | --- |
| Base game (3 layers) | https://eldenring.wiki.fextralife.com/Interactive+Map |
| DLC | https://eldenring.wiki.fextralife.com/Shadow+of+the+Erdtree+Map |

### Iframe endpoints and marker counts (fetched 2026-06-09)

| Cache file | mapCode | Layer | Iframe URL | Markers |
| --- | --- | --- | --- | --- |
| `markers-overworld-mapA.json` | `mapA` | The Lands Between (overworld) | https://eldenring.wiki.fextralife.com/file/Elden-Ring/map-50be4728-3907-4f33-8857-7f063e0d24eb.html | 3,134 |
| `markers-underground-mapB.json` | `mapB` | Underground (Siofra/Ainsel/Deeproot/Mohgwyn) | https://eldenring.wiki.fextralife.com/file/Elden-Ring/map-c5431314-6159-4599-9668-0ccf4e1f8e9a.html | 461 |
| `markers-ashen-capital-mapC.json` | `mapC` | Leyndell, Ashen Capital (post-burn overlay) | https://eldenring.wiki.fextralife.com/file/Elden-Ring/map-96747699-d8a3-44b4-b2d6-cf6b45c579c6.html | 53 |
| `markers-dlc-mapD.json` | `mapD` | Realm of Shadow (Shadow of the Erdtree) | https://eldenring.wiki.fextralife.com/file/Elden-Ring/map-9d02bccc-081b-4a1d-b26e-a363f366fb40.html | 1,463 |

Base game total (mapA+mapB+mapC): **3,648** markers. DLC (mapD): **1,463** markers.

## Cache file shape

```json
{
  "_source": { "name", "page", "iframe", "mapCode", "label", "fetchedAt", "note" },
  "categories": [ { "id": "Armor", "name": "Armor", "loadDefault": false }, ... ],
  "items": [ <marker>, ... ]
}
```

### Marker object (verbatim from Fextralife)

```json
{
  "id": 8753,
  "category": "Summoning Pool",
  "name": " Effigy of the Martyr: Commander O'Neil",
  "image": "/file/Elden-Ring/map-50be4728-.../maps-icons/locations/summoning-pool.png",
  "imageSize": 40,
  "imageSizeW": 40,
  "imageSizeH": 40,
  "pageLink": "/Effigies+of+the+Martyr",
  "hasLabel": false,
  "hasPageLink": true,
  "hasCoordsLink": true,
  "clickable": false,
  "x": "-181.320312",
  "y": "143.027618",
  "description": "Summoning Pool Effigy located by the stake of Marika ..."
}
```

Field notes for `build-data.mjs` (Task 6 — the `extractMarkers` adapter must use these):

- **`x` is the Leaflet latitude, `y` is the longitude** — the iframe code constructs
  markers with `new L.latLng([this.x, this.y])`. Both are *strings*; `Number()` them.
  Verified: 100% of markers in all four files have `name`, numeric `x`/`y`, and a
  numeric `id` (5,111/5,111).
- **`id` IS the Fextralife deep-link `?id=` param.** Links of the form
  `https://eldenring.wiki.fextralife.com/Interactive+Map?id=4810&code=mapB` appear on
  Fextralife's own pages, so `?id=<items[].id>&code=<mapCode>` is the deep-link format
  (mapD deep links go on the `/Shadow+of+the+Erdtree+Map` page).
- `name` sometimes has a leading space; trim before matching.
- `category` is the map layer name (e.g. `Weapons`, `Talismans`, `Key`, `Site of Grace`);
  distribution for mapA is dominated by Consumables/Upgrade Materials/Graces — filter by
  the item-name match, not by marker category.
- `description` may contain HTML (`<a href=...>`).
- mapC (Ashen Capital) is the post-Forge-of-the-Giants overlay of Leyndell; its markers
  use `code=mapC` for deep links. The spec's `map.code` vocabulary is
  `overworld|underground|dlc`; mapC markers are physically in the overworld but need
  `code=mapC` in the URL — Task 6/4 should decide the mapping (the cache keeps them in a
  separate file so nothing is lost).

## Other sources tried / not needed

- **wiki.gg interactive map (`Map:` namespace)** — not needed; Fextralife (option 1)
  met the acceptance bar (≥3,000 base / ≥800 DLC) with marker ids that match the
  Fextralife `?id=` deep-link params the site uses.
- **Open community datasets (GitHub)** — not needed for the same reason.

## Licensing / attribution

Marker data © Fextralife community (eldenring.wiki.fextralife.com), fetched politely
(single fetch per map, cached and committed). This project is open-source and
non-commercial; attribution goes in the site footer and root README per the spec (§3).
