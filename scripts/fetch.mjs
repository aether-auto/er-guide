import { access, mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const CACHE = path.join(HERE, 'cache')
const sources = JSON.parse(await readFile(path.join(HERE, 'sources.json'), 'utf8'))
const delay = (ms) => new Promise((r) => setTimeout(r, ms))
const UA = 'er-guide data pipeline (open-source, non-commercial; https://github.com/aether-auto/er-guide)'

async function fetchText(url) {
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await fetch(url, { headers: { 'user-agent': UA } })
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`)
      return await res.text()
    } catch (err) {
      if (attempt >= 3) throw err
      console.warn(`retry ${attempt} for ${url}: ${err.message}`)
      await delay(1500 * attempt)
    }
  }
}

async function fetchJson(url) {
  return JSON.parse(await fetchText(url))
}

async function save(rel, value) {
  const file = path.join(CACHE, rel)
  await mkdir(path.dirname(file), { recursive: true })
  await writeFile(file, JSON.stringify(value, null, 2))
  console.log('cached', rel)
}

async function isCached(rel) {
  return access(path.join(CACHE, rel)).then(() => true, () => false)
}

// --- 1. wiki.gg category members (paginated; optionally recursive) ---
// ADAPTATION from the plan: wiki.gg stores weapons/shields/armor in leaf
// subcategories (Category:Daggers, Category:Head, ...), not flat in the parent
// category, so entries in sources.json may be { name, recursive, excludeSubcats }
// and the fetcher walks the subcategory tree (deduping pages by pageid and
// skipping Nightreign/Images maintenance subtrees).
const SKIP_SUBCAT = /nightreign|^Category:Images?\b|^Category:Pages\b/i

async function fetchCategoryPage(cat, type, cont) {
  const url = new URL(sources.wikigg.api)
  url.search = new URLSearchParams({
    action: 'query', list: 'categorymembers', cmtitle: `Category:${cat}`,
    cmlimit: '500', cmtype: type, format: 'json',
    ...(cont ? { cmcontinue: cont } : {}),
  }).toString()
  return fetchJson(url.toString())
}

async function fetchAllMembers(cat, type) {
  const members = []
  let cont
  do {
    const page = await fetchCategoryPage(cat, type, cont)
    members.push(...(page.query?.categorymembers ?? []))
    cont = page.continue?.cmcontinue
    await delay(400)
  } while (cont)
  return members
}

const cacheNameFor = (cat) => `wikigg/category-${cat.replace(/[^A-Za-z0-9 -]/g, '').replaceAll(' ', '_')}.json`

for (const entry of sources.wikigg.categories) {
  const spec = typeof entry === 'string' ? { name: entry } : entry
  const rel = cacheNameFor(spec.name)
  if (await isCached(rel)) continue

  const excluded = new Set(spec.excludeSubcats ?? [])
  const seen = new Set() // pageids
  const members = []
  const queue = [spec.name]
  const visited = new Set(queue)
  while (queue.length) {
    const cat = queue.shift()
    for (const m of await fetchAllMembers(cat, 'page')) {
      if (seen.has(m.pageid)) continue
      seen.add(m.pageid)
      members.push(m)
    }
    if (spec.recursive) {
      for (const sub of await fetchAllMembers(cat, 'subcat')) {
        const subName = sub.title.replace(/^Category:/, '')
        if (visited.has(subName)) continue
        if (excluded.has(sub.title) || SKIP_SUBCAT.test(sub.title)) continue
        visited.add(subName)
        queue.push(subName)
      }
    }
  }
  if (members.length === 0) console.warn(`WARNING: category "${spec.name}" returned 0 members — check the name`)
  await save(rel, members)
}

// --- 2. Elden Ring Fan API (paginated) ---
for (const resource of sources.fanapi.resources) {
  const rel = `fanapi/${resource}.json`
  if (await isCached(rel)) continue
  const all = []
  for (let page = 0; ; page++) {
    const data = await fetchJson(`${sources.fanapi.base}/${resource}?limit=100&page=${page}`)
    all.push(...(data.data ?? []))
    if ((data.data ?? []).length < 100) break
    await delay(400)
  }
  await save(rel, all)
}

// --- 3. Interactive-map markers ---
// ADAPTATION from the plan (Task 5 Step 3 discovery): Fextralife does not serve
// marker JSON from a separate endpoint — each map iframe's HTML embeds the full
// dataset inline as `var items = [...]` / `var categories = [...]`. We download
// each iframe (sources.map.fextralife.iframes) and extract those literals.
// Marker `id` is the Fextralife `?id=` deep-link param. x = Leaflet lat, y = lng
// (the iframe code does `new L.latLng([this.x, this.y])`).
function extractJsArrayLiteral(html, varName) {
  const m = html.match(new RegExp(`var ${varName} = (\\[.*?\\]);`, 's'))
  if (!m) throw new Error(`could not find "var ${varName} = [...]" in iframe HTML`)
  return JSON.parse(m[1])
}

for (const frame of sources.map.fextralife?.iframes ?? []) {
  const rel = `map/markers-${frame.slug}.json`
  if (await isCached(rel)) continue
  const html = await fetchText(frame.url)
  const items = extractJsArrayLiteral(html, 'items')
  const categories = extractJsArrayLiteral(html, 'categories')
  const mapCode = html.match(/var mapCode = '([^']+)'/)?.[1] ?? frame.code
  if (mapCode !== frame.code) console.warn(`WARNING: iframe ${frame.url} reports mapCode ${mapCode}, expected ${frame.code}`)
  if (items.length === 0) console.warn(`WARNING: map ${frame.code} returned 0 markers`)
  await save(rel, {
    _source: {
      name: 'Fextralife Elden Ring Interactive Map',
      page: frame.code === 'mapD' ? sources.map.fextralife.pages.dlc : sources.map.fextralife.pages.base,
      iframe: frame.url,
      mapCode: frame.code,
      label: frame.label,
      fetchedAt: new Date().toISOString(),
      note: 'items[].id is the Fextralife ?id= deep-link param; items[].x is Leaflet lat, items[].y is lng',
    },
    categories,
    items,
  })
  await delay(600)
}

// generic JSON marker endpoints (none currently; kept for future sources)
for (const [i, url] of sources.map.markerEndpoints.entries()) {
  const rel = `map/markers-${String(i).padStart(2, '0')}.json`
  if (await isCached(rel)) continue
  await save(rel, await fetchJson(url))
  await delay(600)
}

console.log('fetch complete')
