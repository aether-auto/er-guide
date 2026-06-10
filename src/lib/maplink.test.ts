import { describe, expect, it } from 'vitest'
import { mapUrl, DEFAULT_MAP_URL } from './maplink'

describe('mapUrl', () => {
  it('builds a deep link with marker id and coordinates', () => {
    const url = new URL(mapUrl({ code: 'overworld', markerId: 4605, lat: -95.5, lng: 110.5 }))
    expect(url.searchParams.get('id')).toBe('4605')
    expect(url.searchParams.get('lat')).toBe('-95.5')
    expect(url.searchParams.get('lng')).toBe('110.5')
    expect(url.searchParams.get('zoom')).toBeTruthy()
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
    const c = mapUrl({ code: 'dlc', markerId: null, lat: 0, lng: 0 })
    expect(new Set([a, b, c]).size).toBe(3)
  })

  it('exports the overworld map page as the default idle iframe url', () => {
    expect(DEFAULT_MAP_URL).toBe('https://eldenring.wiki.fextralife.com/Interactive+Map')
  })
})
