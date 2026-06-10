// Mirror the Fextralife Elden Ring map tile pyramids (z0..6) into public/tiles/.
//
// Task M1 of docs/superpowers/plans/2026-06-10-map-v2.md. For each of the four
// map iframes in sources.json (map.fextralife.iframes) this script:
//   1. fetches the iframe HTML and discovers the tileLayer URL template
//      (`tileLayer('<path>/{z}/{x}/{y}.jpg'`), minZoom/maxZoom, and the map
//      bounds (`mapSW = [0, N], mapNE = [N, 0]` — pixel extent at maxZoom);
//   2. mirrors z0..6 (z7 skipped — the UI uses maxNativeZoom 6 + upscaling),
//      discovering which tiles exist by frontier probing: z0 candidates come
//      from the bounds grid, and at each deeper zoom only the children
//      (2x..2x+1, 2y..2y+1) of tiles that exist at z-1 are probed. A 404 means
//      "outside the map" and prunes that branch. (The bounds are padded — e.g.
//      35000px advertised vs an actual 32768px = 256*2^7 image — so the grid
//      is an upper bound and probing finds the true extent.)
//   3. recompresses every tile to webp q72 via sharp. Decision recorded in
//      public/tiles/README.md: raw JPEG z0..6 for all four layers measured
//      ~372MB (over the 250MB budget); webp q72 brings the total to ~20% of
//      that. The UI must therefore use the `.webp` extension in its template:
//      `tiles/{code}/{z}/{x}/{y}.webp`.
//
// Politeness (same spirit as scripts/fetch.mjs): ≤2 concurrent requests,
// ~150ms delay between requests per worker, identifying UA, 3x retry with
// backoff on 5xx/network errors. Resume support: tiles already on disk are
// skipped (no request). 404s are re-probed on resume (they are not persisted).
//
// Usage: node scripts/fetch-tiles.mjs [overworld|underground|ashen|dlc ...]
//        (no args = all four layers, in order)

import { access, mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(HERE, '..')
const OUT_ROOT = path.join(ROOT, 'public', 'tiles')
const sources = JSON.parse(await readFile(path.join(HERE, 'sources.json'), 'utf8'))

const ORIGIN = 'https://eldenring.wiki.fextralife.com'
const UA = 'er-guide data pipeline (open-source, non-commercial; https://github.com/aether-auto/er-guide)'
const TILE_PX = 256
const MIRROR_MAX_Z = 6
const CONCURRENCY = 2
const DELAY_MS = 150
const WEBP_QUALITY = 72
const FAIL_FRACTION_ABORT = 0.05 // >5% persistent failures => abort (holey pyramid)

// iframe code -> layer directory name used by the UI
const LAYER_CODE = { mapA: 'overworld', mapB: 'underground', mapC: 'ashen', mapD: 'dlc' }

const delay = (ms) => new Promise((r) => setTimeout(r, ms))
const exists = (file) => access(file).then(() => true, () => false)
const mb = (bytes) => `${(bytes / 1048576).toFixed(1)}MB`

async function fetchWithRetry(url, { binary = false } = {}) {
  for (let attempt = 1; ; attempt++) {
    let res
    try {
      res = await fetch(url, { headers: { 'user-agent': UA } })
    } catch (err) {
      if (attempt >= 3) throw err
      console.warn(`retry ${attempt} (network) for ${url}: ${err.message}`)
      await delay(1500 * attempt)
      continue
    }
    if (res.status === 404) {
      res.body?.cancel()
      return null // outside the map
    }
    if (!res.ok) {
      res.body?.cancel()
      if (attempt >= 3) throw new Error(`HTTP ${res.status}: ${url}`)
      console.warn(`retry ${attempt} (HTTP ${res.status}) for ${url}`)
      await delay(1500 * attempt)
      continue
    }
    return binary ? Buffer.from(await res.arrayBuffer()) : await res.text()
  }
}

// --- discovery: tile template + zoom range + bounds from the iframe HTML ---
async function discoverLayer(frame) {
  const html = await fetchWithRetry(frame.url)
  if (html == null) throw new Error(`iframe 404: ${frame.url}`)

  const tpl = html.match(/tileLayer\('([^']+)\/\{z\}\/\{x\}\/\{y\}\.jpg'\s*,\s*\{([^}]*)\}/)
  if (!tpl) throw new Error(`no tileLayer template found in ${frame.url}`)
  const [, basePath, opts] = tpl
  const minZoom = Number(opts.match(/minZoom\s*:\s*(\d+)/)?.[1] ?? 0)
  const maxZoom = Number(opts.match(/maxZoom\s*:\s*(\d+)/)?.[1] ?? 7)

  // mapSW = [0, 35000], mapNE = [35000, 0] — pixel extent at maxZoom.
  const bounds = html.match(/mapSW\s*=\s*\[\s*(\d+)\s*,\s*(\d+)\s*\]\s*,\s*mapNE\s*=\s*\[\s*(\d+)\s*,\s*(\d+)\s*\]/)
  const extentPx = bounds ? Math.max(...bounds.slice(1, 5).map(Number)) : TILE_PX * 2 ** maxZoom
  return { basePath, minZoom, maxZoom, extentPx, discovery: bounds ? 'html bounds (mapSW/mapNE) + frontier probe' : 'frontier probe (no bounds found)' }
}

// --- small worker pool with per-worker delay ---
async function runPool(jobs, worker) {
  const queue = [...jobs]
  const runners = Array.from({ length: CONCURRENCY }, async () => {
    for (;;) {
      const job = queue.shift()
      if (job === undefined) return
      const didRequest = await worker(job)
      if (didRequest) await delay(DELAY_MS)
    }
  })
  await Promise.all(runners)
}

async function mirrorLayer(frame) {
  const code = LAYER_CODE[frame.code]
  const layerDir = path.join(OUT_ROOT, code)
  const info = await discoverLayer(frame)
  const topZ = Math.min(MIRROR_MAX_Z, info.maxZoom)
  console.log(`\n=== ${code} (${frame.code}) ===`)
  console.log(`template: ${info.basePath}/{z}/{x}/{y}.jpg  zoom ${info.minZoom}..${info.maxZoom}  extent ${info.extentPx}px  [${info.discovery}]`)

  const stats = { tiles: 0, downloaded: 0, resumed: 0, missing: 0, failed: 0, jpgBytes: 0, webpBytes: 0, perZoom: {} }
  let existing = null // Set of "x,y" at the previous zoom

  for (let z = Math.max(0, info.minZoom); z <= topZ; z++) {
    // grid upper bound from the advertised extent (bounds are padded; probing trims)
    const maxIdx = Math.ceil(info.extentPx / TILE_PX / 2 ** (info.maxZoom - z)) - 1
    const candidates = []
    if (existing === null) {
      for (let x = 0; x <= maxIdx; x++) for (let y = 0; y <= maxIdx; y++) candidates.push([x, y])
    } else {
      for (const key of existing) {
        const [px, py] = key.split(',').map(Number)
        for (const x of [2 * px, 2 * px + 1]) {
          if (x > maxIdx) continue
          for (const y of [2 * py, 2 * py + 1]) {
            if (y > maxIdx) continue
            candidates.push([x, y])
          }
        }
      }
    }

    const zStats = { ok: 0, missing: 0, resumed: 0, failed: 0 }
    const found = new Set()
    await runPool(candidates, async ([x, y]) => {
      const outFile = path.join(layerDir, String(z), String(x), `${y}.webp`)
      if (await exists(outFile)) {
        found.add(`${x},${y}`)
        zStats.resumed++
        return false // no request made — no delay needed
      }
      let buf
      try {
        buf = await fetchWithRetry(`${ORIGIN}${info.basePath}/${z}/${x}/${y}.jpg`, { binary: true })
      } catch (err) {
        console.error(`FAIL ${code} ${z}/${x}/${y}: ${err.message}`)
        zStats.failed++
        return true
      }
      if (buf === null) {
        zStats.missing++ // 404 — outside the map
        return true
      }
      const webp = await sharp(buf).webp({ quality: WEBP_QUALITY }).toBuffer()
      await mkdir(path.dirname(outFile), { recursive: true })
      await writeFile(outFile, webp)
      found.add(`${x},${y}`)
      zStats.ok++
      stats.jpgBytes += buf.length
      stats.webpBytes += webp.length
      return true
    })

    stats.perZoom[z] = zStats
    stats.tiles += zStats.ok + zStats.resumed
    stats.downloaded += zStats.ok
    stats.resumed += zStats.resumed
    stats.missing += zStats.missing
    stats.failed += zStats.failed
    console.log(`${code} z${z}: ${zStats.ok + zStats.resumed}/${candidates.length} tiles (${zStats.ok} fetched, ${zStats.resumed} resumed, ${zStats.missing} outside-map, ${zStats.failed} FAILED)`)

    const probed = zStats.ok + zStats.missing + zStats.failed
    if (probed > 0 && zStats.failed / probed > FAIL_FRACTION_ABORT)
      throw new Error(`${code} z${z}: ${zStats.failed}/${probed} persistent failures (>5%) — aborting rather than shipping a holey pyramid`)

    existing = found
    if (found.size === 0) throw new Error(`${code} z${z}: zero tiles exist — template or bounds discovery is wrong`)
  }
  return { code, info, stats }
}

const args = process.argv.slice(2)
const frames = sources.map.fextralife.iframes.filter(
  (f) => args.length === 0 || args.includes(LAYER_CODE[f.code]),
)
if (frames.length === 0) {
  console.error(`no layers matched ${JSON.stringify(args)} — valid: ${Object.values(LAYER_CODE).join(' ')}`)
  process.exit(1)
}

const results = []
for (const frame of frames) results.push(await mirrorLayer(frame))

console.log('\n=== summary ===')
let totalTiles = 0
let totalBytes = 0
for (const { code, stats } of results) {
  totalTiles += stats.tiles
  totalBytes += stats.webpBytes
  console.log(
    `${code}: ${stats.tiles} tiles z0..${MIRROR_MAX_Z} (${stats.downloaded} fetched, ${stats.resumed} resumed, ${stats.missing} outside-map, ${stats.failed} failed) — jpg in ${mb(stats.jpgBytes)} -> webp q${WEBP_QUALITY} out ${mb(stats.webpBytes)}`,
  )
}
console.log(`total this run: ${totalTiles} tiles, ${mb(totalBytes)} written (resumed tiles not counted in bytes)`)
const anyFailed = results.some((r) => r.stats.failed > 0)
if (anyFailed) {
  console.error('some tiles FAILED — re-run to retry (resume skips completed tiles)')
  process.exit(1)
}
