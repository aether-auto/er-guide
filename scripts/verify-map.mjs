// Browser acceptance run for map-v2 Task M2 (docs/superpowers/plans/2026-06-10-map-v2.md).
// Usage: npx vite preview --port 5174 &  then  node scripts/verify-map.mjs
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const BASE = 'http://localhost:5174/er-guide/'
mkdirSync('docs/screenshots', { recursive: true })

const results = []
function check(name, ok, detail = '') {
  results.push({ name, ok, detail })
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`)
}

const browser = await chromium.launch({ headless: true })
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
const page = await ctx.newPage()

// 1 ── No fextralife/mapgenie network requests (besides explicit external links)
const externalRequests = []
page.on('request', (req) => {
  const url = req.url()
  if (url.includes('fextralife') || url.includes('mapgenie')) externalRequests.push(url)
})

await page.goto(`${BASE}#/region/limgrave/limgrave-01`)
await page.waitForSelector('.leaflet-container', { timeout: 10000 })
await page.waitForTimeout(2500)

check('Leaflet map rendered', !!(await page.$('.leaflet-container')))
const tileCount = await page.locator('img.leaflet-tile[src*="/tiles/"]').count()
check('Local webp tiles loaded', tileCount > 0, `${tileCount} tiles`)
check('No fextralife/mapgenie network requests', externalRequests.length === 0,
  externalRequests.slice(0, 3).join(', ') || 'none')

// 2 ── Pins + graces legible (z3 default)
const pinCount = await page.locator('.er-pin').count()
const graceCount = await page.locator('.er-grace').count()
check('Category pins rendered', pinCount > 0, `${pinCount} pins`)
check('Grace glow markers rendered', graceCount > 0, `${graceCount} graces`)

// Route polylines + active leg highlight
const routeCount = await page.locator('path.er-route').count()
const activeCount = await page.locator('path.er-route--active').count()
check('Per-leg route polylines rendered', routeCount > 0, `${routeCount} polylines`)
check('Active leg polyline highlighted', activeCount === 1, `${activeCount} active`)

// RoutePanel + Next up callout
check('RoutePanel rendered', !!(await page.$('.er-route-panel')))
const nextUpText = await page.locator('.er-route-panel').getByText('Next up', { exact: false }).first().isVisible()
check('"Next up" callout visible', nextUpText)

await page.screenshot({ path: 'docs/screenshots/01-desktop-limgrave.png' })

// 3 ── "Next up" check advances + map gains pulsing pin / dashed segment
const calloutName = await page.locator('.er-route-panel .text-gold.font-semibold').first().textContent()
await page.getByRole('button', { name: '✓ Mark done' }).click()
await page.waitForTimeout(1200) // flyTo + redraw
const calloutName2 = await page.locator('.er-route-panel .text-gold.font-semibold').first().textContent()
check('"Next up" advances on check', calloutName !== calloutName2, `${calloutName} → ${calloutName2}`)
const nextupPin = await page.locator('.er-pin--nextup').count()
check('Pulsing next-up pin present after advance', nextupPin === 1, `${nextupPin} pulsing`)
const dashed = await page.locator('path.er-route--nextup').count()
check('Dashed next-up→following-step segment rendered', dashed === 1, `${dashed} dashed`)

// 4 ── Locate opens popup; popup check updates pin + list live
await page.getByRole('button', { name: '⌖ Locate' }).click()
await page.waitForTimeout(1500) // flyTo + popup open
const popupVisible = !!(await page.$('.leaflet-popup-content-wrapper'))
check('Locate opens pin popup', popupVisible)
await page.screenshot({ path: 'docs/screenshots/02-popup-open.png' })

const checkedBefore = await page.locator('.er-pin--checked').count()
await page.locator('.leaflet-popup-content .er-popup-check').click()
await page.waitForTimeout(800)
const checkedAfter = await page.locator('.er-pin--checked').count()
check('Popup check updates pin style live', checkedAfter > checkedBefore,
  `${checkedBefore} → ${checkedAfter} checked pins`)
const struck = await page.locator('.er-route-panel li .line-through').count()
check('Popup check updates panel list (strikethrough)', struck > 0, `${struck} struck rows`)

// 5 ── Locate on an underground item switches layer + opens popup
await page.goto(`${BASE}#/region/liurnia`)
await page.waitForTimeout(1500)
const ugLocate = page.locator('[aria-label="Locate Swarm of Flies on map"]')
await ugLocate.scrollIntoViewIfNeeded()
await ugLocate.click()
await page.waitForTimeout(1500)
const ugTabActive = !!(await page.$('.er-layer-tab.active[data-code="underground"]'))
const ugPopup = !!(await page.$('.leaflet-popup-content-wrapper'))
check('Underground locate switches layer', ugTabActive)
check('Underground locate opens popup', ugPopup)

// 6 ── DLC region auto-shows DLC layer
await page.goto(`${BASE}#/region/dlc-gravesite`)
await page.waitForTimeout(1500)
const dlcActive = !!(await page.$('.er-layer-tab.active[data-code="dlc"]'))
check('DLC region auto-shows DLC layer', dlcActive)
const dlcTiles = await page.locator('img.leaflet-tile[src*="/tiles/dlc/"]').count()
check('DLC tiles loaded', dlcTiles > 0, `${dlcTiles} tiles`)

// 9 ── Auto-pan: navigating to a leg moves map center near the next-up pin
// Use weeping-01 (Weeping Peninsula) whose very first step is a mappable item,
// so even with empty progress state the auto-pan fires reliably.
{
  const freshCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const freshPage = await freshCtx.newPage()
  await freshPage.goto(`${BASE}#/region/weeping-peninsula/weeping-01`)
  await freshPage.waitForSelector('.leaflet-container', { timeout: 10000 })
  // Wait for flyTo to settle (0.6s duration + redraw buffer)
  await freshPage.waitForTimeout(2500)
  // Read the Leaflet map center via the data-map-center attribute set by MapView
  // on every moveend event (exposed for test purposes, avoids Leaflet internals).
  const mapCenter = await freshPage.evaluate(() => {
    const container = document.querySelector('.leaflet-container[data-map-center]')
    if (!container) return null
    const raw = container.getAttribute('data-map-center')
    if (!raw) return null
    const [lat, lng] = raw.split(',').map(Number)
    if (isNaN(lat) || isNaN(lng)) return null
    return { lat, lng }
  })
  // The expected next-up pin for a fresh weeping-01 run: stonesword-key-03
  // at lat=-205.789062, lng=116.57444 (Bridge of Sacrifice)
  const expectedLat = -205.789062
  const expectedLng = 116.57444
  const tolerance = 15 // CRS.Simple units — flyTo doesn't need to be pixel-perfect
  if (mapCenter) {
    const latDiff = Math.abs(mapCenter.lat - expectedLat)
    const lngDiff = Math.abs(mapCenter.lng - expectedLng)
    const near = latDiff <= tolerance && lngDiff <= tolerance
    check(
      'Auto-pan: map center moves near next-up pin on leg mount',
      near,
      `center=(${mapCenter.lat.toFixed(3)}, ${mapCenter.lng.toFixed(3)}) pin=(${expectedLat}, ${expectedLng}) Δlat=${latDiff.toFixed(2)} Δlng=${lngDiff.toFixed(2)}`,
    )
  } else {
    check('Auto-pan: map center moves near next-up pin on leg mount', false, 'could not read map center')
  }
  await freshCtx.close()
}

// 7 ── Zoom 7 upscales (maxNativeZoom 6)
await page.goto(`${BASE}#/region/limgrave`)
await page.waitForTimeout(1500)
for (let i = 0; i < 10; i++) {
  const disabled = await page.locator('.leaflet-control-zoom-in.leaflet-disabled').count()
  if (disabled) break
  await page.locator('.leaflet-control-zoom-in').click()
  await page.waitForTimeout(350)
}
const zoomMaxed = await page.locator('.leaflet-control-zoom-in.leaflet-disabled').count()
const tilesAtMax = await page.locator('img.leaflet-tile[src*="/6/"]').count()
check('Zoom reaches max (7) and z6 tiles upscale', zoomMaxed === 1 && tilesAtMax > 0,
  `maxed=${zoomMaxed === 1}, z6 tiles=${tilesAtMax}`)
const pinsAtMax = await page.locator('.er-pin').count()
check('Pins still legible at max zoom', pinsAtMax > 0, `${pinsAtMax} pins`)
await page.screenshot({ path: 'docs/screenshots/04-zoom7-upscale.png' })

// Graces toggle
await page.locator('#er-grace-toggle').click()
await page.waitForTimeout(300)
const gracesHidden = (await page.locator('.er-grace').count()) === 0
await page.locator('#er-grace-toggle').click()
check('Graces toggle hides/shows graces', gracesHidden)

// 8 ── Mobile bottom sheet at 390px
await page.setViewportSize({ width: 390, height: 844 })
await page.waitForTimeout(800)
const box = await page.locator('.er-route-panel').boundingBox()
check('Mobile: panel is a bottom sheet', !!box && box.y > 300 && box.width >= 380,
  box ? `y=${Math.round(box.y)} w=${Math.round(box.width)}` : 'no box')
await page.screenshot({ path: 'docs/screenshots/03-mobile-390px.png' })
// expand
await page.locator('.er-drag-handle').click()
await page.waitForTimeout(500)
const box2 = await page.locator('.er-route-panel').boundingBox()
check('Mobile: sheet expands on handle tap', !!box2 && !!box && box2.height > box.height,
  box2 && box ? `${Math.round(box.height)}px → ${Math.round(box2.height)}px` : '')

await browser.close()

const failed = results.filter((r) => !r.ok)
console.log(`\n${results.length - failed.length}/${results.length} checks passed`)
if (failed.length) process.exit(1)
