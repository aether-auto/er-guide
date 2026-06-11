// Browser acceptance run for the map UI (map-v2 M2 + M3 user-directed changes).
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

// 1 ── No fextralife/mapgenie network requests (the app is fully self-hosted)
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

// 2 ── Pins, graces, locations layers (z3 default)
const pinCount = await page.locator('.er-pin').count()
const graceCount = await page.locator('.er-grace').count()
const locCount = await page.locator('.er-loc').count()
check('Category pins rendered', pinCount > 0, `${pinCount} pins`)
check('Grace glow markers rendered', graceCount > 0, `${graceCount} graces`)
check('Location landmarks rendered', locCount > 0, `${locCount} locations`)

// Route lines are GONE — the pulsing next-up pin + auto-pan are the guidance.
const polylineCount = await page.locator('.leaflet-overlay-pane path').count()
check('Zero route polylines in DOM', polylineCount === 0, `${polylineCount} svg paths`)

// RoutePanel + Next up callout
check('RoutePanel rendered', !!(await page.$('.er-route-panel')))
const nextUpText = await page.locator('.er-route-panel').getByText('Next up', { exact: false }).first().isVisible()
check('"Next up" callout visible', nextUpText)

await page.screenshot({ path: 'docs/screenshots/01-desktop-limgrave.png' })

// 3 ── "Next up" check advances + map gains pulsing pin
const calloutName = await page.locator('.er-route-panel .text-gold.font-semibold').first().textContent()
await page.getByRole('button', { name: '✓ Mark done' }).click()
await page.waitForTimeout(1200) // flyTo + redraw
const calloutName2 = await page.locator('.er-route-panel .text-gold.font-semibold').first().textContent()
check('"Next up" advances on check', calloutName !== calloutName2,
  `${(calloutName ?? '').slice(0, 48)}… → ${calloutName2}`)
const nextupPin = await page.locator('.er-pin--nextup').count()
check('Pulsing next-up pin present after advance', nextupPin === 1, `${nextupPin} pulsing`)

// 4 ── Locate opens the popup info card (self-contained, no external links)
await page.getByRole('button', { name: '⌖ Locate' }).click()
await page.waitForTimeout(1500) // flyTo (z6) + popup open
const popupVisible = !!(await page.$('.leaflet-popup-content-wrapper'))
check('Locate opens pin popup', popupVisible)
check('Popup is a rich info card', !!(await page.$('.leaflet-popup-content .er-popup-card')))
const popupLinks = await page.locator('.leaflet-popup-content a').count()
check('Popup has no external links', popupLinks === 0, `${popupLinks} anchors`)
const chipText = await page.locator('.er-popup-card__chip').first().textContent()
const acqLen = ((await page.locator('.er-popup-card__acq').first().textContent()) ?? '').trim().length
check('Popup shows category chip + acquisition text', !!chipText && acqLen > 10,
  `chip="${chipText}", acquisition ${acqLen} chars`)
await page.screenshot({ path: 'docs/screenshots/02-popup-open.png' })

// 5 ── Grace + location name labels at high zoom (Locate flew to z6)
const zoomClassesOn = await page.evaluate(() => {
  const el = document.querySelector('.leaflet-container')
  return el ? el.classList.contains('er-zoom-ge4') && el.classList.contains('er-zoom-ge5') : false
})
check('Zoom-band classes set at z6', zoomClassesOn)
const visibleGraceLabels = await page.locator('.er-grace-label:visible').count()
check('Grace name labels visible at zoom ≥5', visibleGraceLabels > 0, `${visibleGraceLabels} labels`)
const visibleLocLabels = await page.locator('.er-loc-label:visible').count()
check('Location name labels visible at zoom ≥4', visibleLocLabels > 0, `${visibleLocLabels} labels`)

// 6 ── Popup check updates pin + list live
const checkedBefore = await page.locator('.er-pin--checked').count()
await page.locator('.leaflet-popup-content .er-popup-check').click()
await page.waitForTimeout(800)
const checkedAfter = await page.locator('.er-pin--checked').count()
check('Popup check updates pin style live', checkedAfter > checkedBefore,
  `${checkedBefore} → ${checkedAfter} checked pins`)
const struck = await page.locator('.er-route-panel li .line-through').count()
check('Popup check updates panel list (strikethrough)', struck > 0, `${struck} struck rows`)

// 7 ── Locate on an underground item switches layer + opens popup
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

// 8 ── DLC region auto-shows DLC layer
await page.goto(`${BASE}#/region/dlc-gravesite`)
await page.waitForTimeout(1500)
const dlcActive = !!(await page.$('.er-layer-tab.active[data-code="dlc"]'))
check('DLC region auto-shows DLC layer', dlcActive)
const dlcTiles = await page.locator('img.leaflet-tile[src*="/tiles/dlc/"]').count()
check('DLC tiles loaded', dlcTiles > 0, `${dlcTiles} tiles`)

// 9 ── Auto-pan: navigating to a leg moves map center near the next-up pin.
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
    const raw = document.querySelector('.leaflet-container[data-map-center]')?.getAttribute('data-map-center')
    if (!raw) return null
    const [lat, lng] = raw.split(',').map(Number)
    return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null
  })
  // The expected next-up pin for a fresh weeping-01 run: stonesword-key-03
  // at lat=-205.789062, lng=116.57444 (Bridge of Sacrifice)
  const expectedLat = -205.789062
  const expectedLng = 116.57444
  const tolerance = 15 // CRS.Simple units — flyTo doesn't need to be pixel-perfect
  if (mapCenter) {
    const latDiff = Math.abs(mapCenter.lat - expectedLat)
    const lngDiff = Math.abs(mapCenter.lng - expectedLng)
    check(
      'Auto-pan: map center moves near next-up pin on leg mount',
      latDiff <= tolerance && lngDiff <= tolerance,
      `center=(${mapCenter.lat.toFixed(3)}, ${mapCenter.lng.toFixed(3)}) pin=(${expectedLat}, ${expectedLng}) Δlat=${latDiff.toFixed(2)} Δlng=${lngDiff.toFixed(2)}`,
    )
  } else {
    check('Auto-pan: map center moves near next-up pin on leg mount', false, 'could not read map center')
  }
  await freshCtx.close()
}

// 10 ── Leg navigation does NOT remount the map (single optional-param route).
// Tag the container DOM node with a JS property; client-side leg navigation
// must keep the exact same node (a remount would create a fresh element).
{
  const navCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const navPage = await navCtx.newPage()
  await navPage.goto(`${BASE}#/region/limgrave`)
  await navPage.waitForSelector('.leaflet-container', { timeout: 10000 })
  await navPage.waitForTimeout(1500)
  await navPage.evaluate(() => {
    document.querySelector('.leaflet-container').__erIdentityTag = 'original-node'
  })
  await navPage.getByRole('button', { name: 'Next leg' }).click() // region view → first leg
  await navPage.waitForTimeout(1500)
  const survived = await navPage.evaluate(() => ({
    tag: document.querySelector('.leaflet-container')?.__erIdentityTag ?? null,
    url: location.hash,
  }))
  check('Map DOM node survives leg navigation (no remount)',
    survived.tag === 'original-node' && /\/region\/limgrave\/limgrave-01/.test(survived.url),
    `tag=${survived.tag}, url=${survived.url}`)
  await navCtx.close()
}

// 11 ── Zoom 7 upscales (maxNativeZoom 6)
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

// 12 ── Graces + locations toggles
await page.locator('#er-grace-toggle').click()
await page.waitForTimeout(300)
const gracesHidden = (await page.locator('.er-grace').count()) === 0
await page.locator('#er-grace-toggle').click()
check('Graces toggle hides/shows graces', gracesHidden)

await page.locator('#er-location-toggle').click()
await page.waitForTimeout(300)
const locsHidden = (await page.locator('.er-loc').count()) === 0
await page.locator('#er-location-toggle').click()
await page.waitForTimeout(300)
const locsBack = (await page.locator('.er-loc').count()) > 0
check('Locations toggle hides/shows landmarks', locsHidden && locsBack,
  `hidden=${locsHidden}, restored=${locsBack}`)

// 13 ── Mobile bottom sheet at 390px
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

// 14 ── Ignore feature: panel ⊘ → next-up skips it + row greys + pin greys
{
  const ignCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const ignPage = await ignCtx.newPage()
  await ignPage.goto(`${BASE}#/region/weeping-peninsula/weeping-01`)
  await ignPage.waitForSelector('.leaflet-container', { timeout: 10000 })
  await ignPage.waitForTimeout(2500)

  const nextUpBefore = await ignPage.locator('.er-route-panel .text-gold.font-semibold').first().textContent()
  const ignoreBtn = ignPage.getByRole('button', { name: 'Ignore for now' }).first()
  await ignoreBtn.scrollIntoViewIfNeeded()
  await ignoreBtn.click()
  await ignPage.waitForTimeout(1000)

  const nextUpAfter = await ignPage.locator('.er-route-panel .text-gold.font-semibold').first().textContent()
  const nextUpSkips = nextUpBefore !== nextUpAfter
  const greyedRows = await ignPage.locator('.er-route-panel li.opacity-30').count()
  const ignoredPins = await ignPage.locator('.er-pin--ignored').count()
  check('Ignore from panel: next-up skips it + row greys + pin greys',
    nextUpSkips && greyedRows > 0 && ignoredPins > 0,
    `nextUp "${(nextUpBefore ?? '').slice(0, 32)}"→"${(nextUpAfter ?? '').slice(0, 32)}", ${greyedRows} grey rows, ${ignoredPins} grey pins`)
  await ignCtx.close()
}

// 15 ── Restore: ⊘ again un-greys the row and the pin
{
  const restCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const restPage = await restCtx.newPage()
  await restPage.goto(`${BASE}#/region/weeping-peninsula/weeping-01`)
  await restPage.waitForSelector('.leaflet-container', { timeout: 10000 })
  await restPage.waitForTimeout(2500)

  const ignBtn = restPage.getByRole('button', { name: 'Ignore for now' }).first()
  await ignBtn.scrollIntoViewIfNeeded()
  await ignBtn.click()
  await restPage.waitForTimeout(800)
  const greyedMid = await restPage.locator('.er-route-panel li.opacity-30').count()

  const restoreBtn = restPage.getByRole('button', { name: 'Restore' }).first()
  await restoreBtn.scrollIntoViewIfNeeded()
  await restoreBtn.click()
  await restPage.waitForTimeout(800)

  const greyedAfter = await restPage.locator('.er-route-panel li.opacity-30').count()
  const ignoredPinsAfter = await restPage.locator('.er-pin--ignored').count()
  check('Restore: greyed row and ignored pin revert',
    greyedMid > 0 && greyedAfter === 0 && ignoredPinsAfter === 0,
    `grey rows ${greyedMid}→${greyedAfter}, ignored pins after restore=${ignoredPinsAfter}`)
  await restCtx.close()
}

// 16 ── Ignored items excluded from leg progress count ("(N ignored)" suffix)
{
  const progCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const progPage = await progCtx.newPage()
  await progPage.goto(`${BASE}#/region/weeping-peninsula/weeping-01`)
  await progPage.waitForSelector('.leaflet-container', { timeout: 10000 })
  await progPage.waitForTimeout(2500)

  const legRow = progPage.locator('.er-route-panel').getByText('Leg', { exact: true }).locator('..')
  const legBefore = ((await legRow.textContent()) ?? '').trim()
  const totalBefore = Number(legBefore.match(/\/(\d+)/)?.[1] ?? NaN)

  const ignBtn2 = progPage.getByRole('button', { name: 'Ignore for now' }).first()
  await ignBtn2.scrollIntoViewIfNeeded()
  await ignBtn2.click()
  await progPage.waitForTimeout(800)

  const legAfter = ((await legRow.textContent()) ?? '').trim()
  const totalAfter = Number(legAfter.match(/\/(\d+)/)?.[1] ?? NaN)
  check('Ignored excluded from leg progress count + (N ignored) suffix',
    totalAfter === totalBefore - 1 && legAfter.includes('(1 ignored)'),
    `"${legBefore}" → "${legAfter}"`)
  await progCtx.close()
}

await browser.close()

const failed = results.filter((r) => !r.ok)
console.log(`\n${results.length - failed.length}/${results.length} checks passed`)
if (failed.length) process.exit(1)
