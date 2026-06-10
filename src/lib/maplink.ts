import type { MapCode, MapRef } from './types'

// VERIFIED 2026-06-09: Fetched live from eldenring.wiki.fextralife.com.
// Overworld deep links: Interactive+Map?id=<id>&lat=<lat>&lng=<lng>&code=mapA
//   (confirmed from Bolt of Gransax: ?id=4121&lat=-106.921&lng=115.778&code=mapA)
// Underground: code=mapB (confirmed from Mimic Tear); Ashen: code=mapC;
// DLC: code=mapD (confirmed from Scadutree Fragment: ?id=654882&code=mapD).
// zoom param is NOT used in actual wiki item deep links.

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

// The external Fextralife map link — used by pin popups, opens in a reusable
// named companion window (target 'er-guide-map').
export const FEXTRALIFE_MAP_URL = MAP_PAGE.overworld
