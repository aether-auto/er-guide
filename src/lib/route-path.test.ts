import { describe, expect, it } from 'vitest'
import type { Item, Leg, MapRef } from './types'
import { routePathForLayer } from './route-path'

function makeItem(id: string, code: 'overworld' | 'underground' | 'ashen' | 'dlc', lat: number, lng: number): Item {
  const ref: MapRef = { code, markerId: null, lat, lng }
  return {
    id, name: id, category: 'weapon', dlc: false,
    acquisition: '', missable: null, quest: null,
    map: ref, wikiUrl: null,
  }
}

function makeItemNoMap(id: string): Item {
  return {
    id, name: id, category: 'weapon', dlc: false,
    acquisition: '', missable: null, quest: null,
    map: null, wikiUrl: null,
  }
}

const LEG_EMPTY: Leg = { id: 'l0', from: 'A', to: 'B', summary: '', steps: [] }

const LEG_MIXED: Leg = {
  id: 'l1', from: 'A', to: 'B', summary: '',
  steps: [
    { type: 'item', itemId: 'item-ow1' }, // overworld, has map
    { type: 'direction', text: 'go north' }, // ignored
    { type: 'item', itemId: 'item-ug1' }, // underground → filtered out for overworld query
    { type: 'item', itemId: 'item-ow2' }, // overworld, has map
    { type: 'boss', id: 'boss-x', text: 'X' }, // ignored
    { type: 'item', itemId: 'item-nomap' }, // no map ref → excluded
    { type: 'item', itemId: 'item-ow3' }, // overworld, has map
  ],
}

const ITEMS = new Map<string, Item>([
  ['item-ow1', makeItem('item-ow1', 'overworld', -100, 100)],
  ['item-ug1', makeItem('item-ug1', 'underground', -50, 80)],
  ['item-ow2', makeItem('item-ow2', 'overworld', -105, 102)],
  ['item-ow3', makeItem('item-ow3', 'overworld', -110, 104)],
  ['item-nomap', makeItemNoMap('item-nomap')],
])

describe('routePathForLayer', () => {
  it('returns empty array for a leg with no steps', () => {
    expect(routePathForLayer(LEG_EMPTY, ITEMS, 'overworld')).toEqual([])
  })

  it('returns only overworld coords in leg order', () => {
    const path = routePathForLayer(LEG_MIXED, ITEMS, 'overworld')
    expect(path).toEqual([
      [-100, 100],
      [-105, 102],
      [-110, 104],
    ])
  })

  it('returns only underground coords when queried for underground', () => {
    const path = routePathForLayer(LEG_MIXED, ITEMS, 'underground')
    expect(path).toEqual([[-50, 80]])
  })

  it('returns empty array when layer has no mapped items', () => {
    expect(routePathForLayer(LEG_MIXED, ITEMS, 'ashen')).toEqual([])
    expect(routePathForLayer(LEG_MIXED, ITEMS, 'dlc')).toEqual([])
  })

  it('excludes items with null map ref', () => {
    const legSingleNoMap: Leg = {
      id: 'l2', from: 'A', to: 'B', summary: '',
      steps: [{ type: 'item', itemId: 'item-nomap' }],
    }
    expect(routePathForLayer(legSingleNoMap, ITEMS, 'overworld')).toEqual([])
  })
})
