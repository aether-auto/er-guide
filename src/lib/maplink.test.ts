import { describe, expect, it } from 'vitest'
import { mapUrl, embedMapUrl, FEXTRALIFE_MAP_URL } from './maplink'

describe('mapUrl', () => {
  it('builds a deep link with marker id and coordinates', () => {
    const url = new URL(mapUrl({ code: 'overworld', markerId: 4605, lat: -95.5, lng: 110.5 }))
    expect(url.searchParams.get('id')).toBe('4605')
    expect(url.searchParams.get('lat')).toBe('-95.5')
    expect(url.searchParams.get('lng')).toBe('110.5')
    expect(url.searchParams.get('code')).toBeTruthy()
  })

  it('omits id when there is no marker', () => {
    const url = new URL(mapUrl({ code: 'dlc', markerId: null, lat: 10, lng: 20 }))
    expect(url.searchParams.get('id')).toBeNull()
    expect(url.searchParams.get('lat')).toBe('10')
  })

  it('uses a different page or code per map layer', () => {
    const a = mapUrl({ code: 'overworld', markerId: null, lat: 0, lng: 0 })
    const b = mapUrl({ code: 'underground', markerId: null, lat: 0, lng: 0 })
    const c = mapUrl({ code: 'ashen', markerId: null, lat: 0, lng: 0 })
    const d = mapUrl({ code: 'dlc', markerId: null, lat: 0, lng: 0 })
    expect(new Set([a, b, c, d]).size).toBe(4)
  })

  it('exports the overworld map page as the companion-window idle url', () => {
    expect(FEXTRALIFE_MAP_URL).toBe('https://eldenring.wiki.fextralife.com/Interactive+Map')
  })
})

describe('embedMapUrl', () => {
  it('embeds the mapgenie base-game map for non-dlc regions', () => {
    expect(embedMapUrl(false)).toBe('https://mapgenie.io/elden-ring/maps/the-lands-between')
  })

  it('embeds the mapgenie shadow-realm map for dlc regions', () => {
    expect(embedMapUrl(true)).toBe('https://mapgenie.io/elden-ring/maps/the-shadow-realm')
  })
})
