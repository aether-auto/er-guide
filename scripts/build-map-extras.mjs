// Build data/map-extras.json — map-display-only markers (Sites of Grace) for
// the in-app Leaflet map (Task M1 of docs/superpowers/plans/2026-06-10-map-v2.md).
//
// Source: the cached Fextralife marker dumps (scripts/cache/map/markers-*.json,
// fetched by scripts/fetch.mjs). Graces are NOT items — they never appear in
// items.json or the checklist; this file is map-display data for MapView.
//
// Grace category names differ per layer (verified against the cached
// `categories` arrays): mapA/mapB/mapD use "Site of Grace", mapC (Ashen
// Capital) uses "Sites of Grace" — matched with /^sites? of grace$/i.
//
// Output shape: { graces: [{ code, markerId, name, lat, lng }] }, where code is
// the UI layer code (overworld|underground|ashen|dlc), markerId is the
// Fextralife `?id=` deep-link param, and lat/lng are Leaflet CRS.Simple coords
// (marker `x` is the latitude, `y` the longitude — see scripts/cache/map/README.md).
// Deterministic: layers in iframe order, then markerId ascending.

import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(HERE, '..')
const sources = JSON.parse(await readFile(path.join(HERE, 'sources.json'), 'utf8'))

// iframe code -> layer code used by the UI / public/tiles directories
const LAYER_CODE = { mapA: 'overworld', mapB: 'underground', mapC: 'ashen', mapD: 'dlc' }
const GRACE_CATEGORY = /^sites? of grace$/i

const graces = []
for (const frame of sources.map.fextralife.iframes) {
  const code = LAYER_CODE[frame.code]
  const cacheFile = path.join(HERE, 'cache', 'map', `markers-${frame.slug}.json`)
  const { categories, items } = JSON.parse(await readFile(cacheFile, 'utf8'))

  const graceCat = categories.find((c) => GRACE_CATEGORY.test(c.name))
  if (!graceCat) throw new Error(`no grace category found in ${cacheFile} — categories: ${categories.map((c) => c.name).join(', ')}`)

  const layerGraces = items
    .filter((m) => m.category === graceCat.name)
    .map((m) => ({
      code,
      markerId: m.id,
      name: m.name.trim(),
      lat: Number(m.x),
      lng: Number(m.y),
    }))
    .sort((a, b) => a.markerId - b.markerId)

  for (const g of layerGraces) {
    if (!g.name || !Number.isFinite(g.lat) || !Number.isFinite(g.lng) || !Number.isFinite(g.markerId))
      throw new Error(`bad grace marker in ${cacheFile}: ${JSON.stringify(g)}`)
  }
  console.log(`${code}: ${layerGraces.length} graces (category "${graceCat.name}")`)
  graces.push(...layerGraces)
}

const outFile = path.join(ROOT, 'data', 'map-extras.json')
await writeFile(outFile, JSON.stringify({ graces }, null, 2) + '\n')
console.log(`wrote ${path.relative(ROOT, outFile)}: ${graces.length} graces total`)
