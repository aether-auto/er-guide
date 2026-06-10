import type { MapCode, MapRef } from './types'

// VERIFIED 2026-06-09: Fetched live from eldenring.wiki.fextralife.com.
// Overworld deep links use: Interactive+Map?id=<id>&lat=<lat>&lng=<lng>&code=mapA
//   (confirmed from Bolt of Gransax: ?id=4121&lat=-106.921&lng=115.778&code=mapA
//    and Moonveil: ?id=2909&lat=-174.156251&lng=126.82006&code=mapA)
// Underground deep links use: Interactive+Map?id=<id>&lat=<lat>&lng=<lng>&code=mapB
//   (confirmed from Mimic Tear: ?id=1565&lat=-188.132812&lng=128.731198&code=mapB)
// Ashen Capital (post-burn Leyndell overlay) uses code=mapC on the same base page
//   (mapC discovered in the marker cache — see scripts/cache/map/README.md).
// DLC deep links observed on the wiki omit lat/lng: Interactive+Map?id=<id>&code=mapD
//   (confirmed from Scadutree Fragment: ?id=654882&code=mapD and others). mapUrl()
//   nevertheless appends lat/lng for ALL layers for consistency — the map accepts or
//   ignores the extra params, and the coordinates-only fallback matters for refs
//   without a markerId.
// The DLC has its own dedicated page: /Shadow+of+the+Erdtree+Map (HTTP 200 confirmed)
//   but item deep links go through the base Interactive+Map with code=mapD.
// zoom param is NOT used in actual wiki item deep links (absent from all observed URLs).
// The plan's proposed MAP_PAGE for dlc ('Shadow+of+the+Erdtree+Interactive+Map') was incorrect —
//   the real page path is 'Shadow+of+the+Erdtree+Map', and DLC deep links use the base
//   Interactive+Map page with code=mapD.

const BASE_MAP = 'https://eldenring.wiki.fextralife.com/Interactive+Map'

const MAP_PAGE: Record<MapCode, string> = {
  overworld: BASE_MAP,
  underground: BASE_MAP,
  ashen: BASE_MAP,
  dlc: BASE_MAP,
}

const MAP_CODE: Record<MapCode, string> = {
  overworld: 'mapA',
  underground: 'mapB',
  ashen: 'mapC',
  dlc: 'mapD',
}

export function mapUrl(ref: MapRef): string {
  const url = new URL(MAP_PAGE[ref.code])
  if (ref.markerId != null) url.searchParams.set('id', String(ref.markerId))
  url.searchParams.set('lat', String(ref.lat))
  url.searchParams.set('lng', String(ref.lng))
  url.searchParams.set('code', MAP_CODE[ref.code])
  return url.toString()
}

// VERIFIED 2026-06-10 (in-browser, not just headers): Fextralife serves
// X-Frame-Options: sameorigin on every map page, so deep links CANNOT be iframed —
// they open in a reusable named companion window instead (window.open target
// 'er-guide-map'). FEXTRALIFE_MAP_URL is the idle page for that window.
export const FEXTRALIFE_MAP_URL = MAP_PAGE.overworld

// VERIFIED 2026-06-10: mapgenie.io sends no x-frame-options / frame-ancestors and
// its Mapbox canvas renders and pans inside a cross-origin iframe (headed Chrome
// test). It is the embedded browsing map only — embedded as-is with attribution;
// we do not scrape or deep-link their ToS-protected marker dataset.
const MAPGENIE_BASE_URL = 'https://mapgenie.io/elden-ring/maps/the-lands-between'
const MAPGENIE_DLC_URL = 'https://mapgenie.io/elden-ring/maps/the-shadow-realm'

export function embedMapUrl(dlc: boolean): string {
  return dlc ? MAPGENIE_DLC_URL : MAPGENIE_BASE_URL
}
