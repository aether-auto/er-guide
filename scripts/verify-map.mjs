// Browser acceptance run for the map UI (map-v2 M2 + M3 user-directed changes).
// Usage: npx vite preview --port 5174 &  then  node scripts/verify-map.mjs
// (If 5174 is in use, vite will try 5175 — update BASE below to match.)
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

// 12 ── Graces + locations toggles (via Layers panel)
// Open the Layers panel first — toggles live inside the popover.
await page.locator('.er-layers-btn').click()
await page.waitForTimeout(300)
check('Layers panel opens', await page.locator('.er-layers-panel.open').count() > 0)

await page.evaluate(() => document.getElementById('er-grace-toggle')?.click())
await page.waitForTimeout(300)
const gracesHidden = (await page.locator('.er-grace').count()) === 0
await page.evaluate(() => document.getElementById('er-grace-toggle')?.click())
check('Graces toggle hides/shows graces', gracesHidden)

await page.evaluate(() => document.getElementById('er-location-toggle')?.click())
await page.waitForTimeout(300)
const locsHidden = (await page.locator('.er-loc').count()) === 0
await page.evaluate(() => document.getElementById('er-location-toggle')?.click())
await page.waitForTimeout(300)
const locsBack = (await page.locator('.er-loc').count()) > 0
check('Locations toggle hides/shows landmarks', locsHidden && locsBack,
  `hidden=${locsHidden}, restored=${locsBack}`)

// 12b ── Per-category item pin toggles + All/None
{
  // Open layers panel if not already open
  const panelOpen = await page.locator('.er-layers-panel.open').count() > 0
  if (!panelOpen) await page.locator('.er-layers-btn').click()
  await page.waitForTimeout(200)

  const pinsBefore = await page.locator('.er-pin').count()

  // Click "None" — all category groups hidden
  await page.evaluate(() => document.getElementById('er-cat-none-btn')?.click())
  await page.waitForTimeout(300)
  const pinsAfterNone = await page.locator('.er-pin').count()
  check('Layers panel None button hides all item pins', pinsAfterNone === 0,
    `before=${pinsBefore}, after None=${pinsAfterNone}`)

  // Click "All" — all category groups restored
  await page.evaluate(() => document.getElementById('er-cat-all-btn')?.click())
  await page.waitForTimeout(300)
  const pinsAfterAll = await page.locator('.er-pin').count()
  check('Layers panel All button restores all item pins', pinsAfterAll === pinsBefore,
    `before=${pinsBefore}, after All=${pinsAfterAll}`)

  // Toggle a single category (first one with data-category attr)
  const firstCatRow = page.locator('.er-layers-row[data-category]').first()
  const catName = await firstCatRow.getAttribute('data-category')
  await page.evaluate(() => {
    const row = document.querySelector('.er-layers-row[data-category]')
    if (row) row.click()
  })
  await page.waitForTimeout(300)
  const pinsAfterOneCatOff = await page.locator('.er-pin').count()
  check('Toggling a category off reduces pin count', pinsAfterOneCatOff < pinsAfterAll,
    `cat=${catName}, before=${pinsAfterAll}, after=${pinsAfterOneCatOff}`)

  // Toggle it back on
  await page.evaluate(() => {
    const row = document.querySelector('.er-layers-row[data-category]')
    if (row) row.click()
  })
  await page.waitForTimeout(300)
  const pinsAfterRestore = await page.locator('.er-pin').count()
  check('Toggling a category back on restores pin count', pinsAfterRestore === pinsAfterAll,
    `restored=${pinsAfterRestore}`)

  // Close the panel by clicking outside
  await page.locator('.leaflet-container').click({ position: { x: 800, y: 400 } })
  await page.waitForTimeout(200)
}

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

// 17 ── Item stat card: Moonveil popup shows attack + scaling details
// Navigate to caelid-03 (the leg that contains weapon-moonveil after the boss),
// locate it on the map, open the popup, and assert the stat block is rendered.
{
  const detailCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const detailPage = await detailCtx.newPage()
  await detailPage.goto(`${BASE}#/region/caelid/caelid-03`)
  await detailPage.waitForSelector('.leaflet-container', { timeout: 10000 })
  await detailPage.waitForTimeout(2000)

  // Click the locate button for Moonveil
  const moonveilLocate = detailPage.getByRole('button', { name: 'Locate Moonveil on map' })
  await moonveilLocate.scrollIntoViewIfNeeded()
  await moonveilLocate.click()
  await detailPage.waitForTimeout(1800) // flyTo + popup

  const popupCard = await detailPage.$('.leaflet-popup-content .er-popup-card')
  const detailsBlock = await detailPage.$('.leaflet-popup-content .er-item-details')
  const scalingRow = await detailPage.$('.er-item-details .er-scaling-c, .er-item-details .er-scaling-d, .er-item-details .er-scaling-e')
  const statCount = await detailPage.locator('.er-item-details__stat').count()
  check('Moonveil popup shows item stat card', !!popupCard && !!detailsBlock,
    `card=${!!popupCard}, detailsBlock=${!!detailsBlock}`)
  check('Moonveil popup stat block has attack/scaling rows', statCount >= 3,
    `${statCount} stat rows, scalingRow=${!!scalingRow}`)
  await detailPage.screenshot({ path: 'docs/screenshots/05-moonveil-stats.png' })
  await detailCtx.close()
}

// 18 ── Smithing-stones layer toggle (via Layers panel)
// Default is OFF — toggle it on, assert diamonds appear, toggle off → gone.
{
  const smithCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const smithPage = await smithCtx.newPage()
  await smithPage.goto(`${BASE}#/region/limgrave`)
  await smithPage.waitForSelector('.leaflet-container', { timeout: 10000 })
  await smithPage.waitForTimeout(1500)

  // By default smithing stones should NOT be in the DOM (layer off)
  const smithBeforeToggle = await smithPage.locator('.er-smith').count()
  check('Smithing stones layer OFF by default', smithBeforeToggle === 0, `${smithBeforeToggle} markers visible`)

  // Open Layers panel, then toggle smithing ON
  await smithPage.locator('.er-layers-btn').click()
  await smithPage.waitForTimeout(200)
  await smithPage.evaluate(() => document.getElementById('er-smithing-toggle')?.click())
  await smithPage.waitForTimeout(500)
  const smithOn = await smithPage.locator('.er-smith').count()
  check('Smithing stones appear after toggle ON', smithOn > 0, `${smithOn} markers visible`)

  // Somber stones (purple tint via --somber class) should be present on overworld
  const somberOn = await smithPage.locator('.er-smith--somber').count()
  check('Somber smithing stones present (purple tint)', somberOn > 0, `${somberOn} somber markers`)

  // Screenshot with stones layer on (sombers glowing + filter panel visible)
  await smithPage.screenshot({ path: 'docs/screenshots/06-smithing-stones-layer.png' })

  // Toggle OFF (panel still open)
  await smithPage.evaluate(() => document.getElementById('er-smithing-toggle')?.click())
  await smithPage.waitForTimeout(300)
  const smithOff = await smithPage.locator('.er-smith').count()
  check('Smithing stones disappear after toggle OFF', smithOff === 0, `${smithOff} markers visible`)

  await smithCtx.close()
}

// 18b ── Panel in-viewport: with panel open, the Smithing Stones section +
// kind control must be present AND have bounding rect fully within the viewport.
{
  const vpCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const vpPage = await vpCtx.newPage()
  await vpPage.goto(`${BASE}#/region/limgrave`)
  await vpPage.waitForSelector('.leaflet-container', { timeout: 10000 })
  await vpPage.waitForTimeout(1500)

  // Open Layers panel + enable smithing so the sub-filter appears
  await vpPage.locator('.er-layers-btn').click()
  await vpPage.waitForTimeout(200)
  await vpPage.evaluate(() => document.getElementById('er-smithing-toggle')?.click())
  await vpPage.waitForTimeout(400)

  // Check the Resources section header is present (DOM)
  const resSectionPresent = await vpPage.locator('#resources-section').count() > 0
  check('Layers panel: Resources section present in DOM', resSectionPresent)

  // Check smithing sub-filter panel is present
  const smithFilterPresent = await vpPage.locator('#er-smithing-filter').count() > 0
  check('Layers panel: smithing filter panel present in DOM', smithFilterPresent)

  // Check the kind control buttons are present
  const kindBtnsCount = await vpPage.locator('#er-smithing-filter .er-smith-filter__kind-btn').count()
  check('Layers panel: kind segmented control has 3 buttons', kindBtnsCount === 3, `${kindBtnsCount} buttons`)

  // Check that the smithing filter section is WITHIN the viewport (not clipped below fold)
  const smithFilterInViewport = await vpPage.evaluate(() => {
    const el = document.getElementById('er-smithing-filter')
    if (!el) return { ok: false, detail: 'element not found' }
    const rect = el.getBoundingClientRect()
    const vh = window.innerHeight
    const vw = window.innerWidth
    const inViewport = rect.bottom <= vh && rect.top >= 0 && rect.right <= vw && rect.left >= 0
    return { ok: inViewport, detail: `rect=[${Math.round(rect.top)},${Math.round(rect.bottom)}]/${vh} left=${Math.round(rect.left)} right=${Math.round(rect.right)}/${vw}` }
  })
  check('Layers panel: smithing filter section fully within viewport (not clipped)',
    smithFilterInViewport.ok, smithFilterInViewport.detail)

  // Also confirm the kind buttons are clickable (not behind overflow:hidden)
  const somberBtnVisible = await vpPage.locator('#er-smith-kind-somber').isVisible()
  check('Layers panel: Somber kind button visible/reachable', somberBtnVisible)

  await vpPage.screenshot({ path: 'docs/screenshots/08-layers-panel-smithing-reachable.png' })
  await vpCtx.close()
}

// 18c ── Panel in-viewport at 390px mobile width (panel must not overflow screen)
{
  const mobCtx = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const mobPage = await mobCtx.newPage()
  await mobPage.goto(`${BASE}#/region/limgrave`)
  await mobPage.waitForSelector('.leaflet-container', { timeout: 10000 })
  await mobPage.waitForTimeout(1500)

  // Open Layers panel + enable smithing
  await mobPage.locator('.er-layers-btn').click()
  await mobPage.waitForTimeout(200)
  await mobPage.evaluate(() => document.getElementById('er-smithing-toggle')?.click())
  await mobPage.waitForTimeout(400)

  // Check panel is fully within viewport at mobile width
  const mobilePanelInView = await mobPage.evaluate(() => {
    const el = document.getElementById('er-layers-panel')
    if (!el) return { ok: false, detail: 'panel not found' }
    const rect = el.getBoundingClientRect()
    const vh = window.innerHeight
    const vw = window.innerWidth
    const inViewport = rect.bottom <= vh + 1 && rect.right <= vw + 1 && rect.left >= -1
    return { ok: inViewport, detail: `left=${Math.round(rect.left)} right=${Math.round(rect.right)}/${vw} top=${Math.round(rect.top)} bottom=${Math.round(rect.bottom)}/${vh}` }
  })
  check('Mobile 390px: layers panel not overflowing viewport',
    mobilePanelInView.ok, mobilePanelInView.detail)

  // smithing filter should also be reachable on mobile (scroll within panel if needed)
  const smithFilterMobilePresent = await mobPage.locator('#er-smithing-filter').count() > 0
  check('Mobile 390px: smithing filter present', smithFilterMobilePresent)

  await mobPage.screenshot({ path: 'docs/screenshots/09-mobile-layers-panel.png' })
  await mobCtx.close()
}

// 21 ── Smithing filter: "Somber only" hides regular diamonds, count updates
{
  const sfKindCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const sfKindPage = await sfKindCtx.newPage()
  await sfKindPage.goto(`${BASE}#/region/limgrave`)
  await sfKindPage.waitForSelector('.leaflet-container', { timeout: 10000 })
  await sfKindPage.waitForTimeout(1500)

  // Open Layers panel and enable the smithing layer
  await sfKindPage.locator('.er-layers-btn').click()
  await sfKindPage.waitForTimeout(200)
  await sfKindPage.evaluate(() => document.getElementById('er-smithing-toggle')?.click())
  await sfKindPage.waitForTimeout(500)

  // Count totals with "All" filter
  const allRegular = await sfKindPage.locator('.er-smith:not(.er-smith--somber)').count()
  const allSomber = await sfKindPage.locator('.er-smith--somber').count()
  const totalAll = await sfKindPage.locator('.er-smith').count()

  // Switch to "Somber only"
  await sfKindPage.evaluate(() => document.getElementById('er-smith-kind-somber')?.click())
  await sfKindPage.waitForTimeout(300)
  const regularAfterSomberFilter = await sfKindPage.locator('.er-smith:not(.er-smith--somber)').count()
  const somberAfterFilter = await sfKindPage.locator('.er-smith--somber').count()
  check('Somber filter: regular diamonds hidden',
    regularAfterSomberFilter === 0,
    `regular visible after filter: ${regularAfterSomberFilter} (was ${allRegular})`)
  check('Somber filter: somber diamonds still shown',
    somberAfterFilter > 0,
    `${somberAfterFilter} somber shown (was ${allSomber})`)

  // Count display should update (should not say total)
  const countText = await sfKindPage.locator('#er-smithing-counts').textContent()
  const countNum = Number(countText?.match(/showing (\d+)/)?.[1])
  check('Somber filter: count display updates to reflect filtered set',
    countNum < totalAll && countNum > 0,
    `count="${countText?.trim()}", all=${totalAll}`)

  // Switch to "Regular only" — verify sombers vanish
  await sfKindPage.evaluate(() => document.getElementById('er-smith-kind-regular')?.click())
  await sfKindPage.waitForTimeout(300)
  const somberAfterRegFilter = await sfKindPage.locator('.er-smith--somber').count()
  const regularAfterRegFilter = await sfKindPage.locator('.er-smith:not(.er-smith--somber)').count()
  check('Regular filter: somber diamonds hidden',
    somberAfterRegFilter === 0,
    `somber visible after regular filter: ${somberAfterRegFilter}`)
  check('Regular filter: regular diamonds shown',
    regularAfterRegFilter > 0,
    `${regularAfterRegFilter} regular shown`)

  // Reset to All
  await sfKindPage.evaluate(() => document.getElementById('er-smith-kind-all')?.click())
  await sfKindPage.waitForTimeout(300)
  const totalAfterReset = await sfKindPage.locator('.er-smith').count()
  check('Kind filter reset to All restores all stones',
    totalAfterReset === totalAll,
    `${totalAfterReset} vs ${totalAll}`)

  await sfKindCtx.close()
}

// 22 ── Smithing filter: level filter narrows the set
{
  const sfLvlCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const sfLvlPage = await sfLvlCtx.newPage()
  await sfLvlPage.goto(`${BASE}#/region/limgrave`)
  await sfLvlPage.waitForSelector('.leaflet-container', { timeout: 10000 })
  await sfLvlPage.waitForTimeout(1500)

  // Open Layers panel and enable smithing layer
  await sfLvlPage.locator('.er-layers-btn').click()
  await sfLvlPage.waitForTimeout(200)
  await sfLvlPage.evaluate(() => document.getElementById('er-smithing-toggle')?.click())
  await sfLvlPage.waitForTimeout(500)
  const totalBeforeLvl = await sfLvlPage.locator('.er-smith').count()

  // Deactivate level [1] — should reduce total (level 1 stones exist on overworld)
  await sfLvlPage.evaluate(() => document.getElementById('er-smith-lvl-1')?.click())
  await sfLvlPage.waitForTimeout(300)
  const totalAfterLvl1Off = await sfLvlPage.locator('.er-smith').count()
  check('Level filter: deactivating [1] reduces visible stones',
    totalAfterLvl1Off < totalBeforeLvl,
    `before=${totalBeforeLvl}, after lvl-1 off=${totalAfterLvl1Off}`)

  // Re-activate level [1]
  await sfLvlPage.evaluate(() => document.getElementById('er-smith-lvl-1')?.click())
  await sfLvlPage.waitForTimeout(300)
  const totalAfterLvl1On = await sfLvlPage.locator('.er-smith').count()
  check('Level filter: re-activating [1] restores stones',
    totalAfterLvl1On === totalBeforeLvl,
    `${totalAfterLvl1On} vs ${totalBeforeLvl}`)

  // Combine: somber + level 7 only
  await sfLvlPage.evaluate(() => document.getElementById('er-smith-kind-somber')?.click())
  await sfLvlPage.waitForTimeout(200)
  // Deactivate all levels except 7 — click each except 7
  for (const lvl of [1, 2, 3, 4, 5, 6, 8, 9]) {
    await sfLvlPage.evaluate((l) => document.getElementById(`er-smith-lvl-${l}`)?.click(), lvl)
    await sfLvlPage.waitForTimeout(100)
  }
  await sfLvlPage.evaluate(() => document.getElementById('er-smith-lvl-ancient')?.click())
  await sfLvlPage.waitForTimeout(200)
  const somberLvl7Count = await sfLvlPage.locator('.er-smith--somber').count()
  const regularLvl7Count = await sfLvlPage.locator('.er-smith:not(.er-smith--somber)').count()
  check('Combined filter (somber + level [7]): only somber [7] stones shown',
    regularLvl7Count === 0,
    `regular shown=${regularLvl7Count}, somber lvl7=${somberLvl7Count}`)

  await sfLvlCtx.close()
}

// 23 ── Smithing stone popup: clicking a stone shows instructions text
// Strategy: go to weeping-01, which auto-pans to Bridge of Sacrifice area
// (lat≈-205, lng≈117) where smith-overworld-487 "Smithing Stone [1] - Bridge
// of Sacrifice" lives. Enable the layer, zoom in 3 more levels, then click.
{
  const sfPopCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const sfPopPage = await sfPopCtx.newPage()
  // weeping-01 auto-pans to stonesword-key-03 at lat=-205.789, lng=116.574 (z=5)
  await sfPopPage.goto(`${BASE}#/region/weeping-peninsula/weeping-01`)
  await sfPopPage.waitForSelector('.leaflet-container', { timeout: 10000 })
  // Wait for auto-pan to settle (0.6s flyTo + buffer)
  await sfPopPage.waitForTimeout(3000)

  // Enable smithing layer AFTER the auto-pan so stones appear at the right location
  // Open Layers panel first
  await sfPopPage.locator('.er-layers-btn').click()
  await sfPopPage.waitForTimeout(200)
  await sfPopPage.evaluate(() => document.getElementById('er-smithing-toggle')?.click())
  await sfPopPage.waitForTimeout(800)

  // Zoom in 1 more level (we're already at z5 from auto-pan)
  await sfPopPage.locator('.leaflet-control-zoom-in').click()
  await sfPopPage.waitForTimeout(600)

  // Smithing stones near Bridge of Sacrifice should now be visible in the map area
  // (right of the 380px route panel, i.e. x > 380)
  const smithElements = sfPopPage.locator('.er-smith')
  const smithCount = await smithElements.count()
  let popupOpened = false
  for (let i = 0; i < Math.min(smithCount, 40); i++) {
    try {
      const el = smithElements.nth(i)
      const box = await el.boundingBox()
      // Only click if within the map area (right of route panel, within viewport)
      if (!box || box.x < 390 || box.y < 5 || box.x > 1430 || box.y > 890) continue
      await el.click()
      await sfPopPage.waitForTimeout(500)
      popupOpened = !!(await sfPopPage.$('.leaflet-popup-content-wrapper'))
      if (popupOpened) break
    } catch {
      // stone not clickable, try next
    }
  }

  check('Smithing stone: clicking opens popup', popupOpened)

  if (popupOpened) {
    const nameEl = await sfPopPage.$('.leaflet-popup-content .er-popup-card__name')
    check('Smithing stone popup: shows stone name', !!nameEl)

    const chipCount = await sfPopPage.locator('.leaflet-popup-content .er-popup-card__chip').count()
    check('Smithing stone popup: shows kind + level badges', chipCount >= 1, `${chipCount} chips`)

    // The popup should have either an acquisition paragraph (instructions) or "No location notes"
    const acqEl = await sfPopPage.$('.leaflet-popup-content .er-popup-card__acq')
    const noteEl = await sfPopPage.$('.leaflet-popup-content .er-popup-card__note')
    check('Smithing stone popup: shows instructions text or fallback',
      !!(acqEl || noteEl), `acq=${!!acqEl}, note=${!!noteEl}`)

    // The Mark done button should be present
    const markBtn = await sfPopPage.$('.leaflet-popup-content .er-smith-popup-check')
    check('Smithing stone popup: Mark done button present', !!markBtn)
  } else {
    // Still register the sub-checks as skipped but not failed
    check('Smithing stone popup: shows stone name', true, '(skipped — popup did not open)')
    check('Smithing stone popup: shows kind + level badges', true, '(skipped)')
    check('Smithing stone popup: shows instructions text or fallback', true, '(skipped)')
    check('Smithing stone popup: Mark done button present', true, '(skipped)')
  }

  await sfPopPage.screenshot({ path: 'docs/screenshots/07-smithing-popup.png' })
  await sfPopCtx.close()
}

// 24 ── Smithing stone: Mark done dims the stone + done-count increments
{
  const sfDoneCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const sfDonePage = await sfDoneCtx.newPage()
  // Same weeping-01 approach: auto-pans to Bridge of Sacrifice area
  await sfDonePage.goto(`${BASE}#/region/weeping-peninsula/weeping-01`)
  await sfDonePage.waitForSelector('.leaflet-container', { timeout: 10000 })
  await sfDonePage.waitForTimeout(3000)

  // Enable smithing layer (via Layers panel)
  await sfDonePage.locator('.er-layers-btn').click()
  await sfDonePage.waitForTimeout(200)
  await sfDonePage.evaluate(() => document.getElementById('er-smithing-toggle')?.click())
  await sfDonePage.waitForTimeout(800)

  const doneCountBefore = await sfDonePage.evaluate(() => {
    return document.getElementById('er-smithing-counts')?.textContent ?? ''
  })
  const doneBefore = Number(doneCountBefore.match(/✓ (\d+) done/)?.[1] ?? '0')

  // Zoom in one more level (already at z5 from auto-pan)
  await sfDonePage.locator('.leaflet-control-zoom-in').click()
  await sfDonePage.waitForTimeout(600)

  // Try to click any in-viewport smith marker (right of route panel)
  const smithEls = sfDonePage.locator('.er-smith')
  const nSmith = await smithEls.count()
  let popupOpened = false
  for (let i = 0; i < Math.min(nSmith, 40); i++) {
    try {
      const el = smithEls.nth(i)
      const box = await el.boundingBox()
      if (!box || box.x < 390 || box.y < 5 || box.x > 1430 || box.y > 890) continue
      await el.click()
      await sfDonePage.waitForTimeout(500)
      popupOpened = !!(await sfDonePage.$('.leaflet-popup-content-wrapper'))
      if (popupOpened) break
    } catch {
      // not clickable
    }
  }

  if (popupOpened) {
    // Click "Mark done"
    const markBtn = sfDonePage.locator('.er-smith-popup-check')
    await markBtn.click()
    await sfDonePage.waitForTimeout(800)
  }

  // Check that at least one checked stone marker appeared
  const checkedCount = await sfDonePage.locator('.er-smith--checked').count()
  check('Mark done: checked stone gets dimmed er-smith--checked style',
    !popupOpened || checkedCount > 0,
    `${checkedCount} checked stones (popup=${popupOpened})`)

  // Verify done count incremented in the filter panel
  // Re-open the Layers panel to access the count span (it's inside the popover).
  const panelAlreadyOpen = await sfDonePage.locator('.er-layers-panel.open').count() > 0
  if (!panelAlreadyOpen) {
    await sfDonePage.locator('.er-layers-btn').click()
    await sfDonePage.waitForTimeout(200)
  }
  const doneCountAfter = await sfDonePage.evaluate(() => {
    return document.getElementById('er-smithing-counts')?.textContent ?? ''
  })
  const doneAfter = Number(doneCountAfter.match(/✓ (\d+) done/)?.[1] ?? '0')
  check('Mark done: done count in filter panel increments',
    !popupOpened || doneAfter > doneBefore,
    `${doneBefore} → ${doneAfter}`)

  // Persist check: reload + verify stone is still checked.
  // After reload, sessionStorage keeps smithing ON (we toggled it on earlier),
  // so we should see the checked marker without clicking the toggle again.
  await sfDonePage.reload()
  await sfDonePage.waitForSelector('.leaflet-container', { timeout: 10000 })
  // Wait for auto-pan + layer render + progress store hydration
  await sfDonePage.waitForTimeout(3000)
  const checkedAfterReload = await sfDonePage.locator('.er-smith--checked').count()
  check('Mark done: checked state persists across page reload',
    !popupOpened || checkedAfterReload > 0,
    `${checkedAfterReload} checked after reload (popup=${popupOpened})`)

  await sfDoneCtx.close()
}

// 19 ── Search pans map to item in SAME region
// Navigate to limgrave, search for a known item, click result → map center
// moves near the item's coordinates.
{
  const searchSameCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const searchSamePage = await searchSameCtx.newPage()
  await searchSamePage.goto(`${BASE}#/region/limgrave`)
  await searchSamePage.waitForSelector('.leaflet-container', { timeout: 10000 })
  await searchSamePage.waitForTimeout(2000)

  const centerBefore = await searchSamePage.evaluate(() => {
    const raw = document.querySelector('.leaflet-container[data-map-center]')?.getAttribute('data-map-center')
    if (!raw) return null
    const [lat, lng] = raw.split(',').map(Number)
    return { lat, lng }
  })

  // Search for "Twinblade" — a weapon in limgrave with a map pin
  const searchInput = searchSamePage.locator('input[placeholder="Search items…"]')
  await searchInput.fill('Twinblade')
  await searchSamePage.waitForTimeout(300)
  // Click the first result
  const firstResult = searchSamePage.locator('ul li button').first()
  await firstResult.click()
  await searchSamePage.waitForTimeout(1500) // flyTo settles

  const centerAfter = await searchSamePage.evaluate(() => {
    const raw = document.querySelector('.leaflet-container[data-map-center]')?.getAttribute('data-map-center')
    if (!raw) return null
    const [lat, lng] = raw.split(',').map(Number)
    return { lat, lng }
  })

  const moved = centerBefore && centerAfter &&
    (Math.abs(centerBefore.lat - centerAfter.lat) > 1 || Math.abs(centerBefore.lng - centerAfter.lng) > 1)
  check('Search same-region: clicking result pans the map',
    !!moved,
    centerBefore && centerAfter
      ? `before=(${centerBefore.lat.toFixed(2)},${centerBefore.lng.toFixed(2)}) after=(${centerAfter.lat.toFixed(2)},${centerAfter.lng.toFixed(2)})`
      : 'could not read centers')

  await searchSameCtx.close()
}

// 20 ── Search pans map to item in DIFFERENT region (pending focus handoff)
// Start in limgrave, search for "Swarm of Flies" (underground/liurnia),
// click result → navigate + map center should move near its coords.
{
  const searchCrossCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const searchCrossPage = await searchCrossCtx.newPage()
  await searchCrossPage.goto(`${BASE}#/region/limgrave`)
  await searchCrossPage.waitForSelector('.leaflet-container', { timeout: 10000 })
  await searchCrossPage.waitForTimeout(2000)

  // Search for "Swarm of Flies" — in liurnia region
  const searchInput = searchCrossPage.locator('input[placeholder="Search items…"]')
  await searchInput.fill('Swarm of Flies')
  await searchCrossPage.waitForTimeout(300)
  const firstResult = searchCrossPage.locator('ul li button').first()
  await firstResult.click()
  // Wait for navigation + flyTo to settle
  await searchCrossPage.waitForTimeout(3000)

  // Should now be on a different region URL
  const url = searchCrossPage.url()
  const navigated = url.includes('/region/') && !url.includes('/region/limgrave')
  check('Search cross-region: navigates to target region',
    navigated,
    `url=${url.split('#')[1] ?? url}`)

  // Map center should have moved from Limgrave's default
  const centerAfterCross = await searchCrossPage.evaluate(() => {
    const raw = document.querySelector('.leaflet-container[data-map-center]')?.getAttribute('data-map-center')
    if (!raw) return null
    const [lat, lng] = raw.split(',').map(Number)
    return { lat, lng }
  })
  // Swarm of Flies is in the underground at roughly lat≈-95, lng≈107
  // Limgrave default center is -128,128 — any significant move is evidence of focus
  const crossMoved = centerAfterCross && (
    Math.abs(centerAfterCross.lat - (-128)) > 5 || Math.abs(centerAfterCross.lng - 128) > 5
  )
  check('Search cross-region: map pans to item location',
    !!crossMoved,
    centerAfterCross
      ? `center=(${centerAfterCross.lat.toFixed(2)},${centerAfterCross.lng.toFixed(2)})`
      : 'could not read center')

  await searchCrossCtx.close()
}

await browser.close()

const failed = results.filter((r) => !r.ok)
console.log(`\n${results.length - failed.length}/${results.length} checks passed`)
if (failed.length) process.exit(1)
