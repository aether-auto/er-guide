import { readFile, readdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const CACHE = path.join(HERE, 'cache')
const DATA = path.join(HERE, '..', 'data')

const norm = (s) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ').trim()
const slug = (s) => norm(s).replaceAll(' ', '-')

// wiki.gg cache file stem (after "category-", before ".json") -> [our category, isDlcCategory].
// Keys match the REAL files produced by scripts/fetch.mjs (see scripts/sources.json _notes):
// weapons/shields/armor were fetched recursively; staves/seals are separate categories that
// map to 'weapon'; spirit ashes are "Ashes"; great runes are "Great_Rune" (singular);
// flasks (crimson/cerulean/physick — one-time pickups) map to 'tool'.
const CATEGORY_FROM_WIKI = {
  'Weapons': ['weapon', false],
  'Shields': ['shield', false],
  'Glintstone_Staves': ['weapon', false],
  'Sacred_Seals': ['weapon', false],
  'Arrows': ['ammo', false],
  'Bolts': ['ammo', false],
  'Armor': ['armor', false],
  'Talismans': ['talisman', false],
  'Sorceries': ['sorcery', false],
  'Incantations': ['incantation', false],
  'Ashes_of_War': ['ash-of-war', false],
  'Ashes': ['spirit-ash', false],
  'Key_Items': ['key-item', false],
  'Cookbooks': ['cookbook', false],
  'Bell_Bearings': ['bell-bearing', false],
  'Crystal_Tears': ['crystal-tear', false],
  'Whetblades': ['whetblade', false],
  'Great_Rune': ['great-rune', false],
  'Remembrances': ['remembrance', false],
  'Tools': ['tool', false],
  'Multiplayer_items': ['tool', false],
  'Flasks': ['tool', false],
  'Shadow_of_the_Erdtree_Talismans': ['talisman', true],
  'Ashes-Shadow_of_the_Erdtree': ['spirit-ash', true],
  'Cookbooks_Shadow_of_the_Erdtree': ['cookbook', true],
  'Sorceries-Shadow_of_the_Erdtree': ['sorcery', true],
  'Key_Items-Shadow_of_the_Erdtree': ['key-item', true],
}

// Countable collectibles that are wiki PAGES, not categories — they become numbered
// instances (golden-seed-01..NN). Counts verified 2026-06-09:
// - Golden Seed: 41 world pickups listed on eldenring.wiki.gg/wiki/Golden_Seed
//   (the +1 character-creation keepsake is excluded; no DLC golden seeds exist —
//   the plan's dlcCount 14 estimate was wrong).
// - Sacred Tear: 12 (wiki acquisition list; matches the 12 church markers). No DLC tears.
// - Memory Stone: "A total of 8 memory stones can be acquired" (wiki page).
// - Larval Tear: "A total of 18 ... per playthrough. Another 9 ... Realm of Shadow" (wiki page).
// - Stonesword Key: the wiki.gg page list is non-exhaustive; count = 54 Fextralife
//   world-pickup markers named "Stonesword Key - ..." (purchasable ones excluded — infinite
//   via merchants/Twin Maiden Husks).
// - Scadutree Fragment: "a total of 50 ... within the Land of Shadow" (wiki page).
// - Revered Spirit Ash: "a total of 25 ... within the Land of Shadow" (wiki page).
const SINGLETON_SERIES = [
  { category: 'golden-seed', name: 'Golden Seed', baseCount: 41, dlcCount: 0 },
  { category: 'sacred-tear', name: 'Sacred Tear', baseCount: 12, dlcCount: 0 },
  { category: 'memory-stone', name: 'Memory Stone', baseCount: 8, dlcCount: 0 },
  { category: 'larval-tear', name: 'Larval Tear', baseCount: 18, dlcCount: 9 },
  { category: 'stonesword-key', name: 'Stonesword Key', baseCount: 54, dlcCount: 0 },
  { category: 'scadutree-fragment', name: 'Scadutree Fragment', baseCount: 0, dlcCount: 50 },
  { category: 'revered-spirit-ash', name: 'Revered Spirit Ash', baseCount: 0, dlcCount: 25 },
]

// Pages that exist on wiki.gg but are missing from every usable category (verified via
// the API: Messmer's Kindling is only in the giant Category:Items catch-all).
const SUPPLEMENTAL = [
  { name: "Messmer's Kindling", category: 'key-item', dlc: true },
]

// Title noise from wiki listings that must not become items. ^Nightreign: pages are
// stray wiki noise from a different game (they appear in Weapons/Ashes of War caches).
const EXCLUDE_TITLE = /(disambiguation|\/|^Category:|^User:|^Template:|^Nightreign:|Network Test|Upgrades?$|Builds?$)/i
// Generic index/class pages that live inside their own category (e.g. the "Talismans"
// page inside Category:Talismans, the "Daggers" class page inside Category:Daggers) —
// verified by scanning the caches. Real plural item names (Caestus, Great Stars,
// Bloodhound Claws, boluses, Mushroom Arms/Legs, plain "Gauntlets", ...) are kept.
const EXCLUDE_EXACT = new Set([
  // category index pages
  'Armor', 'Arrow', 'Ashes', 'Ashes of War', 'Ashes-Shadow of the Erdtree',
  'Bell Bearings', 'Crystal Tear', 'Flask', 'Incantations', 'Key Items', 'Maps',
  'Remembrances', 'Sorceries', 'Talismans', 'Tools', 'Weapons', 'Whetblades',
  // weapon/shield class index pages (from the recursive Weapons/Shields fetch)
  'Axes', 'Backhand Blades', 'Ballistas', 'Beast Claws', 'Bows', 'Claws',
  'Colossal Swords', 'Colossal Weapons', 'Crossbows', 'Curved Greatswords',
  'Curved Swords', 'Daggers', 'Fists', 'Flails', 'Great Hammers', 'Great Katanas',
  'Great Spears', 'Greataxes', 'Greatbows', 'Greatshields', 'Greatswords',
  'Halberds', 'Hammers', 'Heavy Thrusting Swords', 'Katanas', 'Light Bows',
  'Light Greatswords', 'Medium Shields', 'Perfume Bottles', 'Reapers',
  'Sacred Seals', 'Small Shields', 'Spears', 'Staves', 'Straight Swords',
  'Throwing Blades', 'Thrusting Shields', 'Thrusting Swords', 'Torches',
  'Twinblades', 'Whips',
  // armor slot + tool class index pages
  'Arms', 'Legs', 'Throwing Pots', 'Golden Runes',
])
// Series pages duplicated inside wiki categories (the numbered instances replace them).
const SERIES_TITLE = new RegExp(
  `^(${SINGLETON_SERIES.map((s) => s.name).join('|')})( \\(.*\\))?$`,
)

async function loadCacheDir(dir) {
  const out = []
  let names = []
  try { names = await readdir(path.join(CACHE, dir)) } catch { return out }
  for (const n of names.filter((n) => n.endsWith('.json')).sort()) {
    out.push({ file: n, data: JSON.parse(await readFile(path.join(CACHE, dir, n), 'utf8')) })
  }
  return out
}

// ---- marker adapter (real cache shape, see scripts/cache/map/README.md) ----
// Files: markers-{overworld-mapA,underground-mapB,ashen-capital-mapC,dlc-mapD}.json
// Shape: { _source, categories, items: [{ id, category, name, pageLink, x: "lat", y: "lng", description }] }
const CODE_FROM_FILE = [
  ['overworld-mapA', 'overworld'],
  ['underground-mapB', 'underground'],
  ['ashen-capital-mapC', 'ashen'],
  ['dlc-mapD', 'dlc'],
]
const CODE_ORDER = { overworld: 0, underground: 1, ashen: 2, dlc: 3 }

function extractMarkers(raw, file) {
  const code = CODE_FROM_FILE.find(([slug]) => file.includes(slug))?.[1]
  if (!code) throw new Error(`unknown map cache file ${file}`)
  const out = []
  for (const m of raw.items ?? []) {
    const title = String(m.name ?? '').trim() // names may have leading whitespace
    const lat = Number(m.x) // x is the Leaflet latitude
    const lng = Number(m.y) // y is the longitude
    if (!title || Number.isNaN(lat) || Number.isNaN(lng)) continue
    out.push({
      title, lat, lng, code,
      markerId: Number.isFinite(Number(m.id)) ? Number(m.id) : null,
      category: m.category ?? '',
      // '/Radagon's+Soreseal' -> 'radagon s soreseal' (normalized page name)
      pageName: m.pageLink ? norm(decodeURIComponent(String(m.pageLink)).replace(/^\//, '').replaceAll('+', ' ')) : null,
      description: String(m.description ?? '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim(),
    })
  }
  return out
}

// our category -> Fextralife marker layer names that are a plausible home for it
// (real layer names observed in the cache: Weapons, Shields, Armor, Talismans, Spells,
//  Ash of War / Ashes of War, Spirit Ashes, Key / Key Items, Maps, Remembrance,
//  Consumable(s), Flask Upgrades, Bosses, NPC(s), Site(s) of Grace, ...)
const MARKER_CAT_COMPAT = {
  weapon: ['Weapons', 'Shields'],
  shield: ['Shields', 'Weapons'],
  ammo: ['Weapons', 'Consumable', 'Consumables'],
  armor: ['Armor'],
  talisman: ['Talismans'],
  sorcery: ['Spells'],
  incantation: ['Spells'],
  'ash-of-war': ['Ash of War', 'Ashes of War'],
  'spirit-ash': ['Spirit Ashes'],
  'key-item': ['Key', 'Key Items'],
  cookbook: ['Key', 'Key Items'],
  'bell-bearing': ['Key', 'Key Items'],
  'crystal-tear': ['Key', 'Key Items', 'Flask Upgrades'],
  whetblade: ['Key', 'Key Items'],
  'map-fragment': ['Maps', 'Key', 'Key Items'],
  'great-rune': ['Key', 'Key Items', 'Bosses'],
  remembrance: ['Remembrance', 'Bosses'],
  tool: ['Key', 'Key Items', 'Consumable', 'Consumables'],
}
// marker layers that are locations rather than item pickups — weak-match only
const LOCATION_LAYERS = new Set([
  'Site of Grace', 'Sites of Grace', 'Bosses', 'NPC', 'NPCs', 'NPC Invader',
  'Summoning Pool', 'Summoning Pools', 'Locations', 'Spiritspring', 'Spiritsprings',
  'Waygates', 'Miquellas Cross',
])

// ---- load everything ----
const wikiCats = await loadCacheDir('wikigg')
const fanapi = await loadCacheDir('fanapi')
const markerFiles = await loadCacheDir('map')
const overrides = JSON.parse(await readFile(path.join(DATA, 'overrides.json'), 'utf8'))._entries ?? {}
const missables = JSON.parse(await readFile(path.join(DATA, 'missables.json'), 'utf8'))._entries ?? {}

// fan API description lookup by normalized name
const fanByName = new Map()
for (const { data } of fanapi) {
  for (const entry of data) {
    if (entry?.name && !fanByName.has(norm(entry.name))) fanByName.set(norm(entry.name), entry)
  }
}

const markers = markerFiles.flatMap(({ file, data }) => extractMarkers(data, file))
const markersByName = new Map() // exact normalized title
const markersByLoose = new Map() // title with " - <location>" / trailing "(...)" stripped
const markersByPage = new Map() // normalized pageLink target
const indexInto = (map, key, m) => {
  if (!key) return
  if (!map.has(key)) map.set(key, [])
  map.get(key).push(m)
}
for (const m of markers) {
  indexInto(markersByName, norm(m.title), m)
  // "Ash of War: Blinkbolt - Fog Rift Catacombs" -> "ash of war blinkbolt",
  // "Mushroom-Seller's Bell Bearing (1)" -> "mushroom seller s bell bearing"
  const loose = norm(m.title.replace(/ [-–] .*$/, '').replace(/\s*\([^)]*\)\s*$/, ''))
  if (loose && loose !== norm(m.title)) indexInto(markersByLoose, loose, m)
  indexInto(markersByPage, m.pageName, m)
}
console.log(`markers extracted: ${markers.length}`)

// ---- build items from wiki categories ----
const items = new Map()
for (const { file, data } of wikiCats) {
  const stem = file.replace(/^category-/, '').replace(/\.json$/, '')
  const mapped = CATEGORY_FROM_WIKI[stem]
  if (!mapped) { console.warn(`no category mapping for cache file ${file} — skipped`); continue }
  const [defaultCategory, isDlcCat] = mapped
  for (const member of data) {
    const title = member.title
    if (!title || EXCLUDE_TITLE.test(title) || EXCLUDE_EXACT.has(title)) continue
    if (SERIES_TITLE.test(title)) continue // covered by numbered SINGLETON_SERIES instances
    // Re-home pages filed under Key Items that belong to finer categories:
    // map fragments have no wiki category ("Map <Region>" pages), and NPC bell
    // bearings / some cookbooks are dual-listed (re-categorizing makes their ids
    // collide with the Bell_Bearings/Cookbooks copies, deduping them).
    let category = defaultCategory
    if (defaultCategory === 'key-item') {
      if (/^Map [A-Z]/.test(title)) category = 'map-fragment'
      else if (/Bell Bearing/.test(title)) category = 'bell-bearing'
      else if (/Cookbook/.test(title)) category = 'cookbook'
    }
    const id = `${category}-${slug(title)}`
    const existing = items.get(id)
    if (existing) { existing.dlc = existing.dlc || isDlcCat; continue }
    items.set(id, {
      id, name: title, category, dlc: isDlcCat,
      acquisition: '', missable: null, quest: null, map: null,
      wikiUrl: `https://eldenring.wiki.gg/wiki/${encodeURIComponent(title.replaceAll(' ', '_'))}`,
    })
  }
}
for (const extra of SUPPLEMENTAL) {
  const id = `${extra.category}-${slug(extra.name)}`
  if (!items.has(id)) {
    items.set(id, {
      id, name: extra.name, category: extra.category, dlc: extra.dlc,
      acquisition: '', missable: null, quest: null, map: null,
      wikiUrl: `https://eldenring.wiki.gg/wiki/${encodeURIComponent(extra.name.replaceAll(' ', '_'))}`,
    })
  }
}

// ---- singleton series (numbered instances) ----
// Each instance is deterministically assigned to the Nth marker whose title starts with
// the series name, sorted by (code, lat, lng); base instances draw from the base-game
// maps, DLC instances from mapD. Route authoring (Tasks 17-24) re-maps individual
// instances via overrides.json where the deterministic order disagrees with the route.
const seriesMarkerPools = new Map()
for (const s of SINGLETON_SERIES) {
  const re = new RegExp(`^${s.name}\\b`)
  const pool = markers
    .filter((m) => re.test(m.title))
    .sort((a, b) =>
      CODE_ORDER[a.code] - CODE_ORDER[b.code] || a.lat - b.lat || a.lng - b.lng)
  seriesMarkerPools.set(s.category, {
    base: pool.filter((m) => m.code !== 'dlc'),
    dlc: pool.filter((m) => m.code === 'dlc'),
  })
}
for (const s of SINGLETON_SERIES) {
  const total = s.baseCount + s.dlcCount
  const pools = seriesMarkerPools.get(s.category)
  for (let i = 1; i <= total; i++) {
    const isDlc = i > s.baseCount
    const id = `${s.category}-${String(i).padStart(2, '0')}`
    const marker = isDlc ? pools.dlc[i - s.baseCount - 1] : pools.base[i - 1]
    items.set(id, {
      id, name: `${s.name} #${i}`, category: s.category, dlc: isDlc,
      acquisition: marker?.description ?? '', missable: null, quest: null,
      map: marker
        ? { code: marker.code, markerId: marker.markerId, lat: marker.lat, lng: marker.lng }
        : null,
      wikiUrl: `https://eldenring.wiki.gg/wiki/${encodeURIComponent(s.name.replaceAll(' ', '_'))}`,
    })
  }
}

// ---- marker matching for wiki items ----
// Strategy: candidates by normalized name (or override markerName), trying name
// variants in order of confidence:
//   1. exact name ("Moonveil"),
//   2. name without a trailing parenthetical ("Battlemage Hugues (Spirit Ash)",
//      "Minor Erdtree (spell)" -> markers lack the qualifier),
//   3. spirit ashes with " Ashes" appended (markers say "Lone Wolf Ashes"... wiki
//      already does too, but NPC ashes like "Ancient Dragon Knight Kristoff" don't),
//   4. armor: "(Altered)" stripped (altered pieces are tailored from the base piece),
//      then trailing words progressively replaced by "Set" ("Alberich's Pointed Hat"
//      -> "Alberich's Set"; Fextralife marks armor by set, not per piece),
// each variant checked against the exact index, then the loose index (marker titles
// carry " - <location>" or "(N)" suffixes), then the pageLink index.
// Rank candidates: pageLink agreement > compatible marker layer > non-location layer,
// then prefer base maps for base items / mapD for DLC items.
function candidatesFor(item, overrideName) {
  const name = overrideName ?? item.name
  const variants = [name]
  const noParen = name.replace(/\s*\([^)]*\)\s*$/, '')
  if (noParen !== name) variants.push(noParen)
  if (item.category === 'spirit-ash' && !/Ashes$/.test(name)) variants.push(`${name} Ashes`)
  if (item.category === 'armor') {
    const base = name.replace(/\s*\(Altered\)\s*$/, '')
    if (base !== name) variants.push(base)
    const words = base.split(' ')
    for (let drop = 1; drop < Math.min(words.length, 4); drop++) {
      variants.push([...words.slice(0, words.length - drop), 'Set'].join(' '))
    }
  }
  for (const v of variants) {
    const key = norm(v)
    const cands = markersByName.get(key) ?? markersByLoose.get(key) ?? markersByPage.get(key)
    if (cands?.length) return cands
  }
  return []
}
function pickMarker(item, cands) {
  const itemKey = norm(item.name)
  const compat = MARKER_CAT_COMPAT[item.category] ?? []
  const score = (m) =>
    (m.pageName === itemKey ? 8 : 0) +
    (compat.includes(m.category) ? 4 : 0) +
    (LOCATION_LAYERS.has(m.category) ? 0 : 2) +
    (item.dlc === (m.code === 'dlc') ? 1 : 0)
  return [...cands].sort((a, b) =>
    score(b) - score(a) || CODE_ORDER[a.code] - CODE_ORDER[b.code] || (a.markerId ?? 0) - (b.markerId ?? 0))[0]
}

let matched = 0
const unmatched = []
for (const item of items.values()) {
  const ov = overrides[item.id]
  if (ov?.exclude) { items.delete(item.id); continue }
  if (missables[item.id]) item.missable = missables[item.id]
  if (ov?.map !== undefined) {
    item.map = ov.map
    if (item.map) matched++
    else unmatched.push(item.id)
    continue
  }
  if (item.map) { matched++; continue } // singleton series already assigned
  const cands = candidatesFor(item, ov?.markerName)
  if (cands.length) {
    const m = pickMarker(item, cands)
    item.map = { code: m.code, markerId: m.markerId, lat: m.lat, lng: m.lng }
    if (m.code === 'dlc') item.dlc = true // shared wiki categories don't flag DLC items
    if (!item.acquisition) item.acquisition = m.description
    matched++
  } else {
    unmatched.push(item.id)
  }
}

// fan API descriptions as acquisition fallback for whatever is still empty
for (const item of items.values()) {
  if (!item.acquisition) {
    const fan = fanByName.get(norm(item.name))
    if (fan) item.acquisition = fan.location ?? fan.description ?? ''
  }
}

// ---- write output ----
const sorted = [...items.values()].sort((a, b) => a.id.localeCompare(b.id))
await writeFile(path.join(DATA, 'items.json'), JSON.stringify(sorted, null, 2))

const byCategory = {}
for (const item of sorted) byCategory[item.category] = (byCategory[item.category] ?? 0) + 1
console.table(byCategory)
console.log(`items: ${sorted.length}, with map: ${matched}, without map: ${unmatched.length}`)
await writeFile(path.join(CACHE, 'unmatched-report.json'), JSON.stringify(unmatched.sort(), null, 2))
