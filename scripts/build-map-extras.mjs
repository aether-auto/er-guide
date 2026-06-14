// Build data/map-extras.json — map-display-only markers (Sites of Grace +
// landmark Locations + Smithing Stones) for the in-app Leaflet map (Tasks M1/M3
// of docs/superpowers/plans/2026-06-10-map-v2.md).
//
// Source: the cached Fextralife marker dumps (scripts/cache/map/markers-*.json,
// fetched by scripts/fetch.mjs). Graces and locations are NOT items — they
// never appear in items.json or the checklist; this file is map-display data
// for MapView.
//
// Grace category names differ per layer (verified against the cached
// `categories` arrays): mapA/mapB/mapD use "Site of Grace", mapC (Ashen
// Capital) uses "Sites of Grace" — matched with /^sites? of grace$/i.
// Location markers use the "Locations" category on every layer (towns, caves,
// catacombs, forts, churches, ruins, towers…). Each location's `kind` is the
// stem of its Fextralife icon filename (…/maps-icons/locations/<kind>.png);
// generic numbered icons (location-NN / location_NN) normalize to "location".
//
// Smithing-stone category names differ per layer: mapA/mapB/mapC use
// "Upgrade Materials", mapD uses "Upgrade Material" (singular) and also has
// some stones under "Crafting Material". mapA has some stones under "Materials".
// All are matched by /^upgrade material[s]?$/i and /^materials?$/i combined
// with a name filter /smithing stone/i. Ancient Dragon stones are included.
//
// Output shape: {
//   graces:        [{ code, markerId, name, lat, lng }],
//   locations:     [{ code, markerId, name, lat, lng, kind }],
//   smithingStones:[{
//     code, markerId, name, lat, lng, somber: boolean,
//     id: string,          // stable "smith-{code}-{markerId}"
//     level: number|null,  // 1-9 from "[N]", or null for ancient/unknown
//     ancient: boolean,    // true for "Ancient Dragon Smithing Stone" variants
//     kind: 'somber'|'regular',
//     instructions: string // description with HTML stripped + whitespace collapsed
//   }],
// }, where code is the UI layer code (overworld|underground|ashen|dlc),
// markerId is the Fextralife `?id=` deep-link param, and lat/lng are Leaflet
// CRS.Simple coords (marker `x` is the latitude, `y` the longitude — see
// scripts/cache/map/README.md). Locations are deduped against graces (same
// markerId, or same name at the same coords on the same layer).
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
const LOCATION_CATEGORY = /^locations$/i
// Smithing stones may appear in "Upgrade Materials", "Upgrade Material", or
// "Materials" / "Crafting Material" depending on the layer.
const UPGRADE_CATEGORY = /^(upgrade material[s]?|materials?|crafting material[s]?)$/i
const SMITHING_STONE_NAME = /smithing stone/i

// ── Smithing stone attribute parsers ──────────────────────────────────────────

/** Extract upgrade level [1]-[9] from a name, or null if absent/ancient. */
function parseSmithLevel(name) {
  const m = /\[(\d+)\]/.exec(name)
  return m ? parseInt(m[1], 10) : null
}

/** True for "Ancient Dragon Smithing Stone" (and Somber variant) — level-less top tier. */
function parseSmithAncient(name) {
  return /ancient dragon smithing stone/i.test(name)
}

/** Strip all HTML tags and collapse whitespace from a description string. */
function stripHtml(html) {
  if (!html) return ''
  return html
    .replace(/<[^>]*>/g, ' ')  // strip tags → spaces
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

/** kind from the icon filename stem; numbered generic icons → "location". */
function locationKind(image) {
  const stem = /\/([^/]+)\.png$/.exec(image ?? '')?.[1]
  if (!stem) return 'location'
  return /^location[-_]\d+$/.test(stem) ? 'location' : stem
}

function validate(entry, cacheFile, label) {
  if (!entry.name || !Number.isFinite(entry.lat) || !Number.isFinite(entry.lng) || !Number.isFinite(entry.markerId))
    throw new Error(`bad ${label} marker in ${cacheFile}: ${JSON.stringify(entry)}`)
}

const graces = []
const locations = []
const smithingStones = []
for (const frame of sources.map.fextralife.iframes) {
  const code = LAYER_CODE[frame.code]
  const cacheFile = path.join(HERE, 'cache', 'map', `markers-${frame.slug}.json`)
  const { categories, items } = JSON.parse(await readFile(cacheFile, 'utf8'))

  const graceCat = categories.find((c) => GRACE_CATEGORY.test(c.name))
  if (!graceCat) throw new Error(`no grace category found in ${cacheFile} — categories: ${categories.map((c) => c.name).join(', ')}`)
  const locationCat = categories.find((c) => LOCATION_CATEGORY.test(c.name))
  if (!locationCat) throw new Error(`no locations category found in ${cacheFile} — categories: ${categories.map((c) => c.name).join(', ')}`)

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

  for (const g of layerGraces) validate(g, cacheFile, 'grace')
  console.log(`${code}: ${layerGraces.length} graces (category "${graceCat.name}")`)
  graces.push(...layerGraces)

  // Locations — deduped against this layer's graces (by markerId, and by
  // identical name at identical coords).
  const graceIds = new Set(layerGraces.map((g) => g.markerId))
  const graceNamePos = new Set(layerGraces.map((g) => `${g.name}@${g.lat},${g.lng}`))
  const layerLocations = items
    .filter((m) => m.category === locationCat.name)
    .map((m) => ({
      code,
      markerId: m.id,
      name: m.name.trim(),
      lat: Number(m.x),
      lng: Number(m.y),
      kind: locationKind(m.image),
    }))
    .filter((l) => !graceIds.has(l.markerId) && !graceNamePos.has(`${l.name}@${l.lat},${l.lng}`))
    .sort((a, b) => a.markerId - b.markerId)

  for (const l of layerLocations) validate(l, cacheFile, 'location')
  console.log(`${code}: ${layerLocations.length} locations (category "${locationCat.name}")`)
  locations.push(...layerLocations)

  // Smithing Stones — from upgrade/materials categories, name filtered.
  // Dedupe by markerId within the layer (some markers may appear in multiple
  // matching categories).
  const seenSmithingIds = new Set()
  const layerSmithing = items
    .filter((m) => UPGRADE_CATEGORY.test(m.category) && SMITHING_STONE_NAME.test(m.name))
    .map((m) => {
      const name = m.name.trim()
      const somber = /somber/i.test(name)
      const ancient = parseSmithAncient(name)
      const level = parseSmithLevel(name)
      const kind = somber ? 'somber' : 'regular'
      const instructions = stripHtml(m.description ?? '')
      return {
        code,
        markerId: m.id,
        name,
        lat: Number(m.x),
        lng: Number(m.y),
        somber,
        id: `smith-${code}-${m.id}`,
        level,
        ancient,
        kind,
        instructions,
      }
    })
    .filter((s) => {
      if (seenSmithingIds.has(s.markerId)) return false
      seenSmithingIds.add(s.markerId)
      return true
    })
    .sort((a, b) => a.markerId - b.markerId)

  for (const s of layerSmithing) {
    if (!s.name || !Number.isFinite(s.lat) || !Number.isFinite(s.lng) || !Number.isFinite(s.markerId))
      throw new Error(`bad smithingStone marker in ${cacheFile}: ${JSON.stringify(s)}`)
  }
  const somberCount = layerSmithing.filter((s) => s.somber).length
  console.log(`${code}: ${layerSmithing.length} smithing stones (${somberCount} somber)`)
  smithingStones.push(...layerSmithing)
}

const outFile = path.join(ROOT, 'data', 'map-extras.json')
await writeFile(outFile, JSON.stringify({ graces, locations, smithingStones }, null, 2) + '\n')
console.log(
  `wrote ${path.relative(ROOT, outFile)}: ${graces.length} graces, ${locations.length} locations, ${smithingStones.length} smithing stones (${smithingStones.filter((s) => s.somber).length} somber)`,
)
