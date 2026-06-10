import type { MapCode, MapRef } from './types'

// VERIFIED 2026-06-09: Fetched live from eldenring.wiki.fextralife.com.
// Overworld deep links use: Interactive+Map?id=<id>&lat=<lat>&lng=<lng>&code=mapA
//   (confirmed from Bolt of Gransax: ?id=4121&lat=-106.921&lng=115.778&code=mapA
//    and Moonveil: ?id=2909&lat=-174.156251&lng=126.82006&code=mapA)
// Underground deep links use: Interactive+Map?id=<id>&lat=<lat>&lng=<lng>&code=mapB
//   (confirmed from Mimic Tear: ?id=1565&lat=-188.132812&lng=128.731198&code=mapB)
// DLC deep links use: Interactive+Map?id=<id>&code=mapD (no lat/lng in wiki links)
//   (confirmed from Scadutree Fragment: ?id=654882&code=mapD and others)
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
  dlc: BASE_MAP,
}

const MAP_CODE: Record<MapCode, string> = {
  overworld: 'mapA',
  underground: 'mapB',
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

export const DEFAULT_MAP_URL = MAP_PAGE.overworld
